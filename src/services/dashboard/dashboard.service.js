'use strict';
const zohoClient = require('../zohoClient.service');
const invoiceService = require('../sales/invoice.service');
const { memo, bust } = require('../../utils/cache');

const TTL = {
  sales: 10 * 60 * 1000,
  items: 10 * 60 * 1000,
  customers: 30 * 60 * 1000,
  top: 15 * 60 * 1000,
};

const num = (v) => Number(v) || 0;
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// NOTE: date windows are computed in the server's timezone. For multi-region
// deployments, align this with the Zoho organization's timezone.
function bounds(now = new Date()) {
  const today = iso(now);
  const startMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const startYear = `${now.getFullYear()}-01-01`;
  const dowMon = (now.getDay() + 6) % 7; // 0 = Monday
  const ws = new Date(now);
  ws.setDate(now.getDate() - dowMon);
  return { today, startWeek: iso(ws), startMonth, startYear };
}

// Page a date-sortable list endpoint (desc) and stop once rows predate `sinceISO`.
async function fetchSince(path, listKey, sinceISO, extra = {}) {
  const out = [];
  let page = 1;
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const data = await zohoClient.get(path, {
      page, per_page: 200, sort_column: 'date', sort_order: 'D', ...extra,
    });
    const rows = data[listKey] || [];
    for (const r of rows) {
      if (r.date && r.date < sinceISO) return out;
      out.push(r);
    }
    if (!data.page_context || !data.page_context.has_more_page) break;
    page += 1;
  }
  return out;
}

// ---- cached data loaders ----
const yearInvoices = () => memo('dash:invoices', TTL.sales, () => fetchSince('/invoices', 'invoices', bounds().startYear));
const yearOrders = () => memo('dash:orders', TTL.sales, () => fetchSince('/salesorders', 'salesorders', bounds().startYear));
const activeItems = () => memo('dash:items', TTL.items, () => zohoClient.getAll('/items', 'items', { filter_by: 'Status.Active' }));
const customerCount = () => memo('dash:customers', TTL.customers, async () =>
  (await zohoClient.getAll('/contacts', 'contacts', { contact_type: 'customer', filter_by: 'Status.Active' })).length);

// ---- computations ----
function computeSales(invoices) {
  const b = bounds();
  const sum = (pred) => invoices.filter(pred).reduce((s, i) => s + num(i.total), 0);
  return {
    today: sum((i) => i.date === b.today),
    week: sum((i) => i.date >= b.startWeek),
    month: sum((i) => i.date >= b.startMonth),
    year: sum(() => true),
  };
}

const CANCELLED = new Set(['void', 'rejected']);
const CLOSED = new Set(['closed']);
const isStockTracked = (it) => it.track_inventory === true || it.item_type === 'inventory';

async function stockLists() {
  const items = await activeItems();
  const tracked = items.filter(isStockTracked);
  const outOfStock = tracked.filter((it) => num(it.available_stock) <= 0);
  const lowStock = tracked.filter((it) =>
    num(it.reorder_level) > 0 && num(it.available_stock) > 0 && num(it.available_stock) <= num(it.reorder_level));
  const map = (it) => ({
    item_id: it.item_id, name: it.name, sku: it.sku,
    available_stock: num(it.available_stock), stock_on_hand: num(it.stock_on_hand),
    reorder_level: num(it.reorder_level),
  });
  return { lowStock: lowStock.map(map), outOfStock: outOfStock.map(map) };
}

const mapOrder = (o) => ({
  salesorder_id: o.salesorder_id, salesorder_number: o.salesorder_number,
  customer_name: o.customer_name, status: o.status, date: o.date, total: num(o.total),
});

async function orderLists() {
  const orders = await yearOrders();
  return {
    recent: orders.slice(0, 200).map(mapOrder),
    pending: orders.filter((o) => !CANCELLED.has(o.status) && !CLOSED.has(o.status)).map(mapOrder),
    cancelled: orders.filter((o) => CANCELLED.has(o.status)).map(mapOrder),
  };
}

async function summary() {
  const [invoices, orders, stock, customers] = await Promise.all([
    yearInvoices(), yearOrders(), stockLists(), customerCount(),
  ]);
  const sales = computeSales(invoices);
  const collected = invoices.reduce((s, i) => s + (num(i.total) - num(i.balance)), 0);
  const outstanding = invoices.reduce((s, i) => s + num(i.balance), 0);

  return {
    generated_at: new Date().toISOString(),
    sales,
    revenue: { ytd_invoiced: sales.year, ytd_collected: collected, outstanding },
    profit: {
      value: null,
      note: 'Gross profit needs cost-of-goods per sale, which is not in list responses.',
      hint: 'See /api/dashboard/top-products for a sampled estimate, or the Phase 9 Sales/P&L report for exact figures.',
    },
    counts: {
      customers,
      pending_orders: orders.filter((o) => !CANCELLED.has(o.status) && !CLOSED.has(o.status)).length,
      cancelled_orders: orders.filter((o) => CANCELLED.has(o.status)).length,
      invoices_ytd: invoices.length,
      low_stock: stock.lowStock.length,
      out_of_stock: stock.outOfStock.length,
    },
    window: bounds(),
  };
}

async function topProducts({ limit = 10, sample = 20 } = {}) {
  return memo(`dash:top:${limit}:${sample}`, TTL.top, async () => {
    const recent = (await zohoClient.get('/invoices', {
      page: 1, per_page: sample, sort_column: 'date', sort_order: 'D',
    })).invoices || [];

    const details = await Promise.all(
      recent.map((i) => invoiceService.get(i.invoice_id).catch(() => null))
    );
    const items = await activeItems();
    const costById = new Map(items.map((it) => [String(it.item_id), num(it.purchase_rate)]));

    const agg = new Map();
    let revenue = 0;
    let cogs = 0;
    let counted = 0;
    for (const inv of details) {
      if (!inv) continue;
      counted += 1;
      for (const li of inv.line_items || []) {
        const key = String(li.item_id);
        const cur = agg.get(key) || { item_id: li.item_id, name: li.name, quantity_sold: 0, revenue: 0 };
        cur.quantity_sold += num(li.quantity);
        cur.revenue += num(li.item_total);
        agg.set(key, cur);
        revenue += num(li.item_total);
        cogs += num(li.quantity) * (costById.get(key) || 0);
      }
    }
    const top = [...agg.values()].sort((a, b) => b.quantity_sold - a.quantity_sold).slice(0, limit);
    return {
      source: 'sampled_recent_invoices',
      invoices_sampled: counted,
      note: `Based on the ${counted} most recent invoices. Use the Phase 9 Sales-by-Item report for exact all-time figures.`,
      sampled_revenue: revenue,
      sampled_gross_profit: revenue - cogs,
      top_products: top,
    };
  });
}

const recentOrders = async (limit = 10) => (await orderLists()).recent.slice(0, limit);
const pendingOrders = async (limit) => { const p = (await orderLists()).pending; return limit ? p.slice(0, limit) : p; };
const cancelledOrders = async (limit) => { const c = (await orderLists()).cancelled; return limit ? c.slice(0, limit) : c; };
const lowStock = async (limit) => { const l = (await stockLists()).lowStock; return limit ? l.slice(0, limit) : l; };
const outOfStock = async (limit) => { const o = (await stockLists()).outOfStock; return limit ? o.slice(0, limit) : o; };

async function sales() { return computeSales(await yearInvoices()); }

const refresh = () => bust('dash:');

module.exports = {
  summary, sales, topProducts,
  recentOrders, pendingOrders, cancelledOrders, lowStock, outOfStock, refresh,
};
