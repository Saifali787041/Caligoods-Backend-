'use strict';
const itemCache = require('./itemCache.service');
const shape = require('./itemShape');

/**
 * Categories, groups, brands and units are NOT standalone REST resources in the
 * Zoho Inventory v1 API - they are fields on items. We derive the distinct
 * values (with item counts) from the shared cached item list. Categories now
 * carry their nested groups so the storefront sidebar can offer expandable
 * "Item -> Group -> Category" navigation.
 */

async function build({ refresh = false } = {}) {
  const items = await itemCache.getAllItems({ refresh });

  const categories = new Map(); // key -> { category_id, category_name, item_count, groups: Map }
  const brands = new Map();
  const units = new Map();
  const productTypes = new Map();
  const availability = { in_stock: 0, limited: 0, out_of_stock: 0, coming_soon: 0 };
  let minPrice = Infinity;
  let maxPrice = 0;

  for (const it of items) {
    const cName = shape.categoryName(it);
    const key = it.category_id || cName;
    const cat = categories.get(key) ||
      { category_id: it.category_id || null, category_name: cName, item_count: 0, groups: new Map() };
    cat.item_count += 1;

    const gName = shape.groupName(it);
    cat.groups.set(gName, (cat.groups.get(gName) || 0) + 1);
    categories.set(key, cat);

    const brand = shape.brandName(it);
    if (brand) brands.set(brand, (brands.get(brand) || 0) + 1);
    if (it.unit) units.set(it.unit, (units.get(it.unit) || 0) + 1);
    const pt = shape.productType(it);
    if (pt) productTypes.set(pt, (productTypes.get(pt) || 0) + 1);

    availability[shape.stockStatus(it)] += 1;
    const rate = shape.num(it.rate);
    if (rate > 0) { minPrice = Math.min(minPrice, rate); maxPrice = Math.max(maxPrice, rate); }
  }

  const byName = (a, b) => a.name.localeCompare(b.name);
  return {
    source: 'aggregated_from_items',
    item_sample_size: items.length,
    generated_at: new Date().toISOString(),
    categories: [...categories.values()]
      .map((c) => ({
        category_id: c.category_id,
        category_name: c.category_name,
        item_count: c.item_count,
        groups: [...c.groups.entries()]
          .map(([name, item_count]) => ({ name, item_count }))
          .sort(byName),
      }))
      .sort((a, b) => a.category_name.localeCompare(b.category_name)),
    brands: [...brands.entries()].map(([name, item_count]) => ({ name, item_count })).sort(byName),
    units: [...units.entries()].map(([name, item_count]) => ({ name, item_count })).sort(byName),
    product_types: [...productTypes.entries()].map(([name, item_count]) => ({ name, item_count })).sort(byName),
    availability,
    price_range: { min: minPrice === Infinity ? 0 : Math.floor(minPrice), max: Math.ceil(maxPrice) },
  };
}

const TTL_MS = 5 * 60 * 1000;
let cache = { at: 0, data: null };

async function getTaxonomy({ refresh = false } = {}) {
  if (!refresh && cache.data && Date.now() - cache.at < TTL_MS) return cache.data;
  const data = await build({ refresh });
  cache = { at: Date.now(), data };
  return data;
}

const getCategories = async (opts) => (await getTaxonomy(opts)).categories;
const getBrands = async (opts) => (await getTaxonomy(opts)).brands;
const getUnits = async (opts) => (await getTaxonomy(opts)).units;

module.exports = { getTaxonomy, getCategories, getBrands, getUnits };
