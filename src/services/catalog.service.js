'use strict';
const itemService = require('./inventory/item.service');
const itemCache = require('./inventory/itemCache.service');
const itemGroup = require('./inventory/itemGroup.service');
const shape = require('./inventory/itemShape');

const { num, stockStatus } = shape;

/**
 * Enrich a raw Zoho item with its item-group name/category (from the light
 * GET /itemgroups list). The option count is computed separately from the
 * items themselves (see list()), so no per-group Zoho calls are needed.
 */
function enrich(it, groupInfo, optionsCount) {
  const out = groupInfo ? {
    ...it,
    group_id: it.group_id || groupInfo.group_id || null,
    group_name: groupInfo.group_name || it.group_name || null,
    category_id: groupInfo.category_id || it.category_id || null,
    category_name: groupInfo.category_name || it.category_name || null,
  } : { ...it };
  out.__options_count = optionsCount || 0;
  return out;
}

// Map a raw Zoho item to a customer-facing product. Cost (purchase_rate) is
// NEVER exposed. Sell price (rate) is included only for authenticated buyers.
function toProduct(it, withPricing, optionsCount) {
  const options = optionsCount || it.__options_count || 1;
  const product = {
    item_id: it.item_id,
    name: it.name,
    sku: it.sku || null,
    brand: shape.brandName(it),
    category_id: it.category_id || null,
    category_name: shape.categoryName(it),
    group_id: it.group_id || null,
    group_name: it.group_name || null,
    product_type: shape.productType(it),
    unit: it.unit || null,
    description: it.description || '',
    available_stock: shape.availableStock(it),
    actual_available_stock: num(it.actual_available_stock),
    stock_on_hand: num(it.stock_on_hand),
    reorder_level: num(it.reorder_level),
    stock_status: stockStatus(it),
    status: it.status || null,
    options_count: options,
    image_document_id: it.image_document_id || null,
    has_image: Boolean(it.image_document_id || it.image_name),
    custom_fields: Array.isArray(it.custom_fields) ? it.custom_fields : [],
  };
  if (withPricing) product.rate = num(it.rate);
  return product;
}

function sortItems(items, column, order) {
  const dir = order === 'D' ? -1 : 1;
  const val = (it) => {
    switch (column) {
      case 'available_stock': return num(it.available_stock);
      case 'rate': return num(it.rate);
      case 'last_modified_time': return new Date(it.last_modified_time || 0).getTime();
      case 'name':
      default: return String(it.name || '').toLowerCase();
    }
  };
  return [...items].sort((a, b) => {
    const av = val(a); const bv = val(b);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

/**
 * List catalog products.
 *
 * Data sources (all your existing endpoints — nothing removed):
 *   - GET /items       -> every item / variant + stock (via itemCache)
 *   - GET /itemgroups  -> variant families, category and option counts
 *
 * Filtering / sorting / pagination happen in-memory because Zoho's /items list
 * endpoint does not honour category / group / brand / price / availability as
 * query params (that was the "categories don't work" bug).
 */
const list = async (query = {}, withPricing) => {
  const refresh = query.refresh === 'true';
  const [rawItems, groupIdx] = await Promise.all([
    itemCache.getAllItems({ refresh }),
    itemGroup.getIndex({ refresh }).catch(() => ({ byGroup: new Map() })),
  ]);

  // Option count = number of items sharing a group_id, computed from the items
  // themselves (no per-group Zoho calls). This is fast and always accurate.
  const countByGroup = new Map();
  for (const it of rawItems) {
    if (it.group_id) countByGroup.set(String(it.group_id), (countByGroup.get(String(it.group_id)) || 0) + 1);
  }

  const all = rawItems.map((it) => {
    const gid = it.group_id ? String(it.group_id) : null;
    const info = gid ? groupIdx.byGroup.get(gid) : null;
    const options = gid ? (countByGroup.get(gid) || 1) : 1;
    return enrich(it, info, options);
  });

  // Optionally show ONLY items marked "Show in Store = true" in Zoho (like the
  // FABS storefront). Only hides items EXPLICITLY false, so a missing field
  // never blanks the catalog. Toggle with SHOW_IN_STORE_ONLY in .env.
  const storeOnly = String(process.env.SHOW_IN_STORE_ONLY || '').toLowerCase() === 'true';
  const visible = storeOnly ? all.filter((it) => shape.isInStore(it) !== false) : all;

  const category = (query.category_name || '').trim();
  const group = (query.group || '').trim();
  const brand = (query.brand || '').trim();
  const search = (query.search_text || '').trim();
  const productType = (query.product_type || '').trim();
  const availability = (query.availability || '').trim();
  const minPrice = query.min_price !== undefined && query.min_price !== '' ? Number(query.min_price) : null;
  const maxPrice = query.max_price !== undefined && query.max_price !== '' ? Number(query.max_price) : null;

  let filtered = visible.filter((it) => {
    if (category && shape.categoryName(it) !== category) return false;
    if (group && shape.groupName(it) !== group) return false;
    if (brand && shape.brandName(it) !== brand) return false;
    if (productType && shape.productType(it) !== productType) return false;
    if (availability && stockStatus(it) !== availability) return false;
    if (!shape.matchesSearch(it, search)) return false;
    if (minPrice !== null || maxPrice !== null) {
      const r = num(it.rate);
      if (minPrice !== null && r < minPrice) return false;
      if (maxPrice !== null && r > maxPrice) return false;
    }
    return true;
  });

  filtered = sortItems(filtered, query.sort_column || 'name', query.sort_order || 'A');

  const total = filtered.length;
  // Allow one-shot fetch of the whole catalog (storefront pulls everything once
  // then filters instantly client-side); cap generously to avoid abuse.
  const perPage = Math.min(Math.max(Number(query.per_page) || 24, 1), 10000);
  const page = Math.max(Number(query.page) || 1, 1);
  const start = (page - 1) * perPage;
  const slice = filtered.slice(start, start + perPage);

  const products = slice.map((it) => {
    const p = toProduct(it, withPricing, it.__options_count);
    // Slim payload for the list (8k+ items): keep only what the cards, options
    // modal, counts and search need. Full detail is available via /catalog/:id.
    return {
      item_id: p.item_id,
      name: p.name,
      sku: p.sku,
      brand: p.brand,
      category_name: p.category_name,
      group_id: p.group_id,
      group_name: p.group_name,
      stock_status: p.stock_status,
      options_count: p.options_count,
      has_image: p.has_image,
    };
  });

  return {
    products,
    page_context: { page, per_page: perPage, has_more_page: start + perPage < total, total },
    pricing_visible: withPricing,
  };
};

const get = async (id, withPricing) => {
  const it = await itemService.get(id);
  let info = null; let options = 1;
  try {
    const idx = await itemGroup.getIndex();
    if (it && it.group_id) {
      info = idx.byGroup.get(String(it.group_id)) || null;
      const all = await itemCache.getAllItems();
      options = all.filter((x) => String(x.group_id) === String(it.group_id)).length || 1;
    }
  } catch { /* non-fatal */ }
  return toProduct(enrich(it, info, options), withPricing, options);
};

module.exports = { list, get, stockStatus, toProduct };
