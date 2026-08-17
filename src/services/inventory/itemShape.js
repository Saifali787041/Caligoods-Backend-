'use strict';

/**
 * Small helpers so the catalog listing and the sidebar facets derive the exact
 * same category / group / brand / stock values from a raw Zoho item.
 */

const num = (v) => Number(v) || 0;

function categoryName(it) {
  return (it.category_name && String(it.category_name).trim()) || 'Uncategorized';
}

/**
 * The "group" dimension (Item -> Group -> Category).
 * Zoho item groups (variant families) expose group_name; when an item is not
 * part of a group we fall back to its category so Group View still renders
 * sensible buckets instead of empty headings.
 */
function groupName(it) {
  return (it.group_name && String(it.group_name).trim()) || categoryName(it);
}

function brandName(it) {
  return (it.brand && String(it.brand).trim()) || null;
}

function productType(it) {
  return (it.product_type && String(it.product_type).trim()) || (it.item_type && String(it.item_type).trim()) || null;
}

// Live stock status derived from Zoho stock fields.
//
// Different Zoho Inventory orgs expose the available quantity under different
// fields, and warehouse/location-tracked orgs keep it inside an array rather
// than at the top level. We check every common shape and sum across
// warehouses/locations so items aren't wrongly reported as out of stock.
const STOCK_FIELDS = [
  'available_stock',
  'available_for_sale_stock',
  'actual_available_stock',
  'actual_available_for_sale_stock',
  'stock_on_hand',
  'actual_stock_on_hand',
];
const LOC_FIELDS = [
  'warehouse_available_stock',
  'location_available_stock',
  'warehouse_available_for_sale_stock',
  'location_available_for_sale_stock',
  'warehouse_actual_available_stock',
  'warehouse_stock_on_hand',
  'location_stock_on_hand',
  'available_stock',
  'stock_on_hand',
];

// Optional: restrict stock to ONE warehouse/location. Set WAREHOUSE_NAME or
// WAREHOUSE_ID in the backend .env. When unset (default), stock is the TOTAL
// across all warehouses.
const WH_ID = String(process.env.WAREHOUSE_ID || '').trim();
const WH_NAME = String(process.env.WAREHOUSE_NAME || '').trim().toLowerCase();
const WH_FILTER = Boolean(WH_ID || WH_NAME);

function warehouseName(l) {
  return l.warehouse_name || l.location_name || l.warehouse || null;
}
const normalize = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const WH_NAME_N = normalize(WH_NAME);
function matchesWarehouse(l) {
  if (WH_ID) return String(l.warehouse_id || l.location_id || '') === WH_ID;
  if (WH_NAME) {
    const n = normalize(warehouseName(l));
    // exact (normalized) or either-contains, so minor formatting differences
    // (case, extra spaces, a suffix like "#1") still match the chosen warehouse.
    return n === WH_NAME_N || n.includes(WH_NAME_N) || WH_NAME_N.includes(n);
  }
  return true;
}

function availableStock(it) {
  const locs = it.warehouses || it.locations || it.location_stocks || [];

  // If a specific warehouse is configured AND the item carries a per-warehouse
  // array, count only that warehouse. Otherwise fall through to the top-level
  // fields — which are already scoped to that warehouse because itemCache
  // requested /items?warehouse_id=...
  if (WH_FILTER && Array.isArray(locs) && locs.some(matchesWarehouse)) {
    let sum = 0;
    for (const l of locs) {
      if (!matchesWarehouse(l)) continue;
      let lbest = 0;
      for (const f of LOC_FIELDS) {
        const v = l[f];
        if (v !== undefined && v !== null && v !== '') lbest = Math.max(lbest, num(v));
      }
      sum += lbest;
    }
    return sum;
  }

  // MAX across top-level stock signals (warehouse-scoped when warehouse_id was
  // applied), compared with the SUM of any warehouse array present.
  let best = 0;
  for (const f of STOCK_FIELDS) {
    const v = it[f];
    if (v !== undefined && v !== null && v !== '') best = Math.max(best, num(v));
  }
  if (!WH_FILTER && Array.isArray(locs) && locs.length) {
    let sum = 0;
    for (const l of locs) {
      let lbest = 0;
      for (const f of LOC_FIELDS) {
        const v = l[f];
        if (v !== undefined && v !== null && v !== '') lbest = Math.max(lbest, num(v));
      }
      sum += lbest;
    }
    best = Math.max(best, sum);
  }
  return best;
}

// Is this item actually inventory-tracked in Zoho? Items with tracking OFF
// (plain sales items) have no stock quantity — they are always sellable, so
// they must show as Available, NOT "out of stock" just because qty is absent.
function isTracked(it) {
  const t = it.track_inventory;
  if (t === true || t === 'true') return true;
  if (t === false || t === 'false') return false;
  if (it.item_type) return String(it.item_type).toLowerCase() === 'inventory';
  // Fallback: treat as tracked only if a real stock value or warehouse array exists.
  const hasVal = STOCK_FIELDS.some((f) => { const v = it[f]; return v !== undefined && v !== null && v !== ''; });
  const locs = it.warehouses || it.locations || it.location_stocks;
  return hasVal || (Array.isArray(locs) && locs.length > 0);
}

// Low-stock threshold (FABS-style): 0 or less = out, 1..LOW = limited, >LOW = available.
// Configurable via LOW_STOCK_THRESHOLD in .env (default 5).
const LOW_STOCK = Number(process.env.LOW_STOCK_THRESHOLD || 5);

function stockStatus(it) {
  // Inactive items count as out of stock so the tiles reconcile
  // (Available + Low stock + Out of stock = Total, no leftover bucket).
  if (it.status && String(it.status).toLowerCase() === 'inactive') return 'out_of_stock';
  // Untracked items have no stock ceiling -> available.
  if (!isTracked(it)) return 'in_stock';
  const avail = availableStock(it);
  if (avail <= 0) return 'out_of_stock';
  if (avail <= LOW_STOCK) return 'limited';
  return 'in_stock';
}

// Case-insensitive multi-field search: name, brand, sku, category, group.
function matchesSearch(it, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [it.name, it.sku, brandName(it), categoryName(it), groupName(it)]
    .some((v) => v && String(v).toLowerCase().includes(needle));
}

// "Show in Store" flag from Zoho Commerce/Inventory. Returns true/false, or
// null when no such field is present on the item.
const STORE_FLAGS = ['show_in_store', 'show_in_storefront', 'is_storefront_item', 'is_online', 'available_for_sale'];
function isInStore(it) {
  for (const f of STORE_FLAGS) {
    const v = it[f];
    if (v === true || v === 'true') return true;
    if (v === false || v === 'false') return false;
  }
  return null;
}

module.exports = { num, categoryName, groupName, brandName, productType, availableStock, isTracked, isInStore, stockStatus, matchesSearch };
