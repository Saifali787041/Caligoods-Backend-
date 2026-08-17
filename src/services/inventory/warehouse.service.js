'use strict';
const zohoClient = require('../zohoClient.service');
const logger = require('../../config/logger');

/**
 * Resolves a Zoho warehouse NAME to its warehouse_id so item stock can be
 * scoped to that warehouse via GET /items?warehouse_id=... (the /items list
 * otherwise returns only aggregate stock, not per-warehouse). Cached.
 */

const TTL_MS = 30 * 60 * 1000;
let cache = { at: 0, list: null };

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

async function fetchWarehouses() {
  // Try the common endpoints; return [] if none work (non-fatal).
  for (const path of ['/settings/warehouses', '/warehouses']) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await zohoClient.getAll(path, 'warehouses');
      if (Array.isArray(rows) && rows.length) return rows;
    } catch (e) { /* try next */ }
  }
  return [];
}

async function getWarehouses({ refresh = false } = {}) {
  if (!refresh && cache.list && Date.now() - cache.at < TTL_MS) return cache.list;
  const list = await fetchWarehouses();
  cache = { at: Date.now(), list };
  return list;
}

// Returns { warehouse_id, warehouse_name } for the configured warehouse, or null.
async function resolveConfigured({ refresh = false } = {}) {
  const wantId = String(process.env.WAREHOUSE_ID || '').trim();
  const wantName = norm(process.env.WAREHOUSE_NAME || '');
  if (!wantId && !wantName) return null;

  const list = await getWarehouses({ refresh });
  const nameOf = (w) => w.warehouse_name || w.location_name || w.name;
  const idOf = (w) => w.warehouse_id || w.location_id || w.id;

  let match = null;
  if (wantId) match = list.find((w) => String(idOf(w)) === wantId);
  if (!match && wantName) {
    match = list.find((w) => norm(nameOf(w)) === wantName)
      || list.find((w) => norm(nameOf(w)).includes(wantName) || wantName.includes(norm(nameOf(w))));
  }
  if (match) return { warehouse_id: String(idOf(match)), warehouse_name: nameOf(match) };
  if (wantId) return { warehouse_id: wantId, warehouse_name: null }; // trust an explicit id
  logger.warn(`Warehouse "${process.env.WAREHOUSE_NAME}" not found in Zoho warehouses list`);
  return null;
}

module.exports = { getWarehouses, resolveConfigured };
