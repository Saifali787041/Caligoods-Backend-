'use strict';
const catchAsync = require('../utils/catchAsync');
const { success } = require('../helpers/apiResponse');
const catalog = require('../services/catalog.service');
const taxonomy = require('../services/inventory/taxonomy.service');
const zohoClient = require('../services/zohoClient.service');

// Pricing is revealed only to authenticated buyers (customer or staff).
const list = catchAsync(async (req, res) => {
  const withPricing = Boolean(req.user);
  const { products, page_context, pricing_visible } = await catalog.list(req.query, withPricing);
  return success(res, {
    message: 'Catalog',
    data: products,
    meta: { ...(page_context || {}), pricing_visible },
  });
});

const get = catchAsync(async (req, res) => {
  const withPricing = Boolean(req.user);
  return success(res, { message: 'Product', data: await catalog.get(req.params.id, withPricing) });
});

// Streams the real product image from Zoho (GET /items/{id}/image) using the
// existing authenticated client. Zoho item images can't be fetched directly by
// the browser (they need the auth token), so we proxy them here. If the item
// has no image, respond 404 so the UI can show a neutral "no image" tile —
// never a fabricated image.
// Small in-memory image cache so we don't re-fetch the same image from Zoho on
// every page load (big browser-speed win). Bounded so memory stays sane.
const IMG_CACHE = new Map(); // item_id -> { data, contentType, at }
const IMG_TTL = 60 * 60 * 1000;
const IMG_MAX = 500;
const image = catchAsync(async (req, res) => {
  const id = String(req.params.id);
  const hit = IMG_CACHE.get(id);
  if (hit && Date.now() - hit.at < IMG_TTL) {
    if (hit.missing) return res.status(404).end();
    res.set('Content-Type', hit.contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.send(hit.data);
  }
  try {
    const { data, contentType } = await zohoClient.getBinary(`/items/${id}/image`);
    if (IMG_CACHE.size >= IMG_MAX) IMG_CACHE.delete(IMG_CACHE.keys().next().value);
    IMG_CACHE.set(id, { data, contentType, at: Date.now() });
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.send(data);
  } catch (e) {
    // Remember "no image" for a while so we don't re-hit Zoho for every load.
    if (IMG_CACHE.size >= IMG_MAX) IMG_CACHE.delete(IMG_CACHE.keys().next().value);
    IMG_CACHE.set(id, { missing: true, at: Date.now() });
    return res.status(404).end();
  }
});

// TEMP diagnostic: reveals the real stock-related field names Zoho returns for
// a few items, so stock mapping can be verified against the live response.
// Read-only metadata (no pricing/cost, no secrets). Safe to remove later.
const debugFields = catchAsync(async (req, res) => {
  const itemCache = require('../services/inventory/itemCache.service');
  const warehouse = require('../services/inventory/warehouse.service');
  const items = await itemCache.getAllItems({ refresh: req.query.refresh === 'true' });
  let warehouses = []; let resolved = null;
  try {
    warehouses = (await warehouse.getWarehouses()).map((w) => ({ id: w.warehouse_id || w.location_id || w.id, name: w.warehouse_name || w.location_name || w.name, is_primary: w.is_primary }));
    resolved = await warehouse.resolveConfigured();
  } catch (e) { /* non-fatal */ }
  const rx = /stock|available|quantity|qty|warehouse|location/i;
  const warehouseNames = new Set();
  const sample = items.slice(0, 5).map((it) => {
    const stockLike = {};
    Object.keys(it).forEach((k) => { if (rx.test(k)) stockLike[k] = it[k]; });
    const arr = it.warehouses || it.locations || it.location_stocks;
    if (Array.isArray(arr)) arr.forEach((l) => { const n = l.warehouse_name || l.location_name || l.warehouse; if (n) warehouseNames.add(n); });
    return {
      name: it.name,
      sku: it.sku || null,
      status: it.status || null,
      show_in_store: it.show_in_store ?? it.show_in_storefront ?? it.is_online ?? null,
      stock_like_fields: stockLike,
      warehouses_sample: Array.isArray(arr) && arr.length ? arr[0] : null,
      all_top_level_keys: Object.keys(it),
    };
  });
  return success(res, { message: 'Item field diagnostic (first 5 items)', data: { count: items.length, configured_warehouse: process.env.WAREHOUSE_NAME || process.env.WAREHOUSE_ID || null, resolved_warehouse: resolved, warehouses, warehouse_names: [...warehouseNames], sample } });
});
// brands, product types, availability counts and price bounds).
const filters = catchAsync(async (req, res) => {
  const tax = await taxonomy.getTaxonomy({ refresh: req.query.refresh === 'true' });
  return success(res, {
    message: 'Catalog filters',
    data: {
      categories: tax.categories,
      brands: tax.brands,
      units: tax.units,
      product_types: tax.product_types,
      availability: tax.availability,
      price_range: tax.price_range,
      total: tax.item_sample_size,
    },
  });
});

module.exports = { list, get, image, filters, debugFields };
