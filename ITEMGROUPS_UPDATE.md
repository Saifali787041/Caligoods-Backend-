# Backend update — Item Groups (options / variants)

## What changed (ADDITIVE — nothing removed)
Your existing API calls are untouched:
- `GET /items`            → all products + search (unchanged)
- `GET /items/{item_id}`  → product detail (unchanged)
- `GET /compositeitems`   → composite items (unchanged)

Added:
- `GET /itemgroups`       → used to build variant families, categories and the
  option count. Read-only, cached 5 minutes, and fully optional: if it ever
  fails, the catalog still returns products (each as a standalone item).

## Files
- `src/services/inventory/itemGroup.service.js`  — NEW. Reads `/itemgroups`
  (and `/itemgroups/{id}` only when a group row doesn't already include its
  items). Builds an index: item_id → { group_id, group_name, category, count }.
- `src/services/catalog.service.js` — enriches each item from that index so the
  API now returns, per product:
    - `group_id`, `group_name`  (so variants collapse into one card)
    - `category_name`           (the group's category, when the group defines one)
    - `options_count`           (number of items in the group = the "N OPTIONS" badge)

## How the storefront uses it
The storefront groups products by `group_id` / `group_name`, shows `options_count`
on the card, and lists every variant in the click-to-open options modal. No
frontend change needed beyond the FABS build already delivered.

## Verified
Syntax-checked, and the grouping / option-count / search / category-filter logic
is covered by an isolated unit test (stubbed Zoho calls) — all assertions pass.

## Not verified
Live Zoho responses (no access here). If your `/itemgroups` list rows don't
include an `items` array, the service fetches `/itemgroups/{id}` per group to
read variants — correct, but a few extra calls on the first (cached) load.
