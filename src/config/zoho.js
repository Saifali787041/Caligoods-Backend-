'use strict';

/**
 * Central Zoho configuration.
 *
 * Values are resolved in this order (first non-empty wins):
 *   1. Environment variables  (process.env.ZOHO_*)   -> used on cloud hosts (Render, etc.)
 *   2. Local file             (src/config/zoho.config.js) -> used in local/dev without a .env
 *
 * This makes a .env file OPTIONAL: if the ZOHO_* env vars are absent,
 * the local git-ignored zoho.config.js supplies them. Secrets live only
 * on the server and are never sent to the frontend.
 */

// Optional local credentials file (git-ignored). Absent by default.
let fileConfig = {};
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  fileConfig = require('./zoho.config') || {};
} catch (_) {
  fileConfig = {}; // file is optional; env vars may be used instead
}

const clean = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().replace(/^['"]|['"]$/g, '');
};

// env value first, then the local file value.
const pick = (envVal, fileVal) => clean(envVal || fileVal);

const zohoConfig = {
  clientId: pick(process.env.ZOHO_CLIENT_ID, fileConfig.clientId),
  clientSecret: pick(process.env.ZOHO_CLIENT_SECRET, fileConfig.clientSecret),
  refreshToken: pick(process.env.ZOHO_REFRESH_TOKEN, fileConfig.refreshToken),
  organizationId: pick(process.env.ZOHO_ORGANIZATION_ID, fileConfig.organizationId),

  // Default data center = India (.in). Override via env or zoho.config.js if needed.
  accountsUrl: pick(
    process.env.ZOHO_ACCOUNTS_URL,
    fileConfig.accountsUrl || 'https://accounts.zoho.in'
  ).replace(/\/+$/, ''),

  apiDomain: pick(
    process.env.ZOHO_API_DOMAIN,
    fileConfig.apiDomain || 'https://www.zohoapis.in'
  ).replace(/\/+$/, ''),

  // Base path for the Zoho Inventory REST API. (Was missing before, which made
  // the HTTP client build an invalid baseURL like "<domain>undefined/...".)
  inventoryPath: '/inventory/v1',

  refreshSkewMs: 2 * 60 * 1000,

  isConfigured() {
    return Boolean(
      this.clientId &&
      this.clientSecret &&
      this.refreshToken &&
      this.organizationId
    );
  },

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error('Zoho configuration is incomplete');
    }
  },
};

module.exports = zohoConfig;
