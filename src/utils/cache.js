'use strict';
// Tiny in-process TTL cache used by aggregation layers (e.g. the dashboard).
const store = new Map();

async function memo(key, ttlMs, loader) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.val;
  const val = await loader();
  store.set(key, { at: Date.now(), val });
  return val;
}

function bust(prefix) {
  if (!prefix) return store.clear();
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
  return undefined;
}

module.exports = { memo, bust };
