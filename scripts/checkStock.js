'use strict';
/*
 * One-off diagnostic: prints the real stock-related fields Zoho returns for a
 * few items, using your EXISTING Zoho client/token (no new auth). Run it from
 * the backend folder:
 *
 *     node scripts/checkStock.js
 *
 * Then copy the output. It reveals which field holds the quantity (e.g.
 * available_stock / stock_on_hand / actual_available_stock) so stock mapping
 * can be confirmed. Safe: read-only, prints no secrets.
 */
try { require('dotenv').config(); } catch (e) { /* dotenv optional */ }

const zohoClient = require('../src/services/zohoClient.service');

const RX = /stock|available|quantity|qty|warehouse|location|track|item_type|product_type|status/i;

(async () => {
  try {
    const data = await zohoClient.get('/items', { per_page: 5, filter_by: 'Status.All' });
    const items = Array.isArray(data) ? data : (data.items || []);
    if (!items.length) { console.log('No items returned.'); process.exit(0); }

    console.log(`\nFetched ${items.length} sample item(s). Stock-related fields:\n`);
    items.forEach((it, i) => {
      const picked = {};
      Object.keys(it).forEach((k) => { if (RX.test(k)) picked[k] = it[k]; });
      console.log(`${i + 1}. ${it.name}`);
      console.log(`   ${JSON.stringify(picked)}`);
      const arr = it.warehouses || it.locations || it.location_stocks;
      if (Array.isArray(arr) && arr.length) {
        console.log(`   warehouses[0]: ${JSON.stringify(arr[0])}`);
      }
      console.log('');
    });
    console.log('Copy everything above and send it back so the stock field can be mapped exactly.\n');
    process.exit(0);
  } catch (e) {
    console.error('ERROR calling Zoho /items:', e.message);
    console.error('Check that your .env Zoho credentials are set and the backend can reach Zoho.');
    process.exit(1);
  }
})();
