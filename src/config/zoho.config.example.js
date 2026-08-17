'use strict';

/**
 * Local Zoho credentials (TEMPLATE).
 *
 * SETUP:
 *   1. Copy this file:  src/config/zoho.config.example.js  ->  src/config/zoho.config.js
 *   2. Fill in the real values below.
 *   3. Do NOT commit zoho.config.js (it is git-ignored).
 *
 * These values are used only when the matching ZOHO_* environment variables
 * are not set, so a .env file is not required for local development.
 *
 * DATA CENTER: use the URLs that match the Zoho account you created the
 * Self Client in:
 *   India  -> https://accounts.zoho.in   +  https://www.zohoapis.in
 *   US     -> https://accounts.zoho.com  +  https://www.zohoapis.com
 *   EU     -> https://accounts.zoho.eu   +  https://www.zohoapis.eu
 */
module.exports = {
  clientId: 'YOUR_ZOHO_CLIENT_ID',
  clientSecret: 'YOUR_ZOHO_CLIENT_SECRET',
  refreshToken: 'YOUR_ZOHO_REFRESH_TOKEN',
  organizationId: 'YOUR_ORGANIZATION_ID',

  accountsUrl: 'https://accounts.zoho.in',
  apiDomain: 'https://www.zohoapis.in',
};
