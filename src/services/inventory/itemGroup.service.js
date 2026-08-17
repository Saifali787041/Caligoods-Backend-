'use strict';
const zohoClient = require('../zohoClient.service');
const logger = require('../../config/logger');

/**
 * Reads Zoho Inventory item groups (GET /itemgroups) and builds an index that
 * tells the catalog, for every item:
 *   - which group (variant family) it belongs to,
 *   - the group's display name and category,
 *   - how many variants ("options") the group has.
 *
 * This is what powers the "N OPTIONS" badge and the variant list shown when a
 * product card is clicked. It is ADDITIVE: it never removes or changes the
 * existing /items usage, and if /itemgroups is unavailable the catalog simply
 * falls back to treating each item as a standalone product.
 */

const TTL_MS = 5 * 60 * 1000;
let cache = { at: 0, data: null };
let inFlight = null;

async function build() {
  let groups = [];
  try {
    groups = await zohoClient.getAll('/itemgroups', 'itemgroups', { filter_by: 'Status.All' });
  } catch (e) {
    logger.warn(`/itemgroups list failed, group names/categories unavailable: ${e.message}`);
    return { byGroup: new Map() };
  }

  // Build a lightweight group_id -> { group_name, category } map from the LIST
  // response only. We do NOT fetch each group's detail (that was an N+1 that
  // made first load extremely slow / rate-limited). Option counts and variant
  // membership are derived from the already-cached items instead.
  const byGroup = new Map();
  for (const g of groups) {
    byGroup.set(String(g.group_id), {
      group_id: g.group_id,
      group_name: g.group_name || null,
      category_id: g.category_id || null,
      category_name: g.category_name || null,
    });
  }
  return { byGroup };
}

async function getIndex({ refresh = false } = {}) {
  const fresh = cache.data && Date.now() - cache.at < TTL_MS;
  if (!refresh && fresh) return cache.data;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const data = await build();
      cache = { at: Date.now(), data };
      return data;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function invalidate() { cache = { at: 0, data: null }; }

module.exports = { getIndex, invalidate };
