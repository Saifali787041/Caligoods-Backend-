'use strict';
const zohoClient = require('../zohoClient.service');
const warehouse = require('./warehouse.service');
const logger = require('../../config/logger');

/**
 * Shared, cached snapshot of every item in Zoho Inventory.
 *
 * Zoho's /items LIST endpoint does NOT reliably filter by category_name, brand,
 * group, availability or price range - those are item *fields*, not supported
 * server-side query params. To make filtering correct we pull the full item
 * list once, cache it briefly, and do all filtering in-memory.
 *
 * When a warehouse is configured (WAREHOUSE_NAME/ID), we pass warehouse_id to
 * /items so the stock numbers Zoho returns are SCOPED TO THAT WAREHOUSE (the
 * list otherwise only carries aggregate stock, so per-warehouse stock read as
 * 0 and everything looked out of stock).
 */

const TTL_MS = 5 * 60 * 1000;
let cache = { at: 0, data: null };
let inFlight = null;

async function fetchAll() {
  const params = { filter_by: 'Status.All' };
  try {
    const wh = await warehouse.resolveConfigured();
    if (wh && wh.warehouse_id) {
      params.warehouse_id = wh.warehouse_id;
      logger.info(`Items scoped to warehouse "${wh.warehouse_name || wh.warehouse_id}" (id ${wh.warehouse_id})`);
    }
  } catch (e) {
    logger.warn(`Warehouse resolve failed (using aggregate stock): ${e.message}`);
  }
  return zohoClient.getAll('/items', 'items', params);
}

async function getAllItems({ refresh = false } = {}) {
  const fresh = cache.data && Date.now() - cache.at < TTL_MS;
  if (!refresh && fresh) return cache.data;
  if (inFlight) return inFlight; // de-dupe concurrent cold requests
  inFlight = (async () => {
    try {
      const items = await fetchAll();
      cache = { at: Date.now(), data: items };
      // One-time diagnostic: print the stock-related field names Zoho actually
      // returns, so stock mapping can be confirmed against the real response.
      if (items[0]) {
        const rx = /stock|available|quantity|qty|warehouse|location/i;
        const stockLike = {};
        Object.keys(items[0]).forEach((k) => { if (rx.test(k)) stockLike[k] = items[0][k]; });
        const tracking = {
          track_inventory: items[0].track_inventory,
          item_type: items[0].item_type,
          product_type: items[0].product_type,
        };
        // eslint-disable-next-line global-require
        const logger = require('../../config/logger');
        logger.info(`[stock-diagnostic] "${items[0].name}" tracking=${JSON.stringify(tracking)} stockFields=${JSON.stringify(stockLike)}`);
      }
      return items;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function invalidate() {
  cache = { at: 0, data: null };
}

module.exports = { getAllItems, invalidate };
