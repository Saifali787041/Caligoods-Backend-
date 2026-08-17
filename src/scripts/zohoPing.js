'use strict';
/* Standalone connectivity test: `npm run zoho:ping`
   Acquires an access token via the refresh token and lists your organizations.
   Works without the DB (token persistence is best-effort). */
require('../config/env');
const zohoConfig = require('../config/zoho');
const zohoToken = require('../services/zohoToken.service');
const zohoClient = require('../services/zohoClient.service');

(async () => {
  if (!zohoConfig.isConfigured()) {
    console.error('\u274c Zoho is not configured. Fill values in src/config/zoho.config.js (or the ZOHO_* env vars).');
    process.exit(1);
  }
  const token = await zohoToken.getAccessToken();
  console.log(`\u2705 Access token acquired (length ${token.length}).`);
  const data = await zohoClient.get('/organizations');
  const orgs = data.organizations || [];
  console.log(`\u2705 ${orgs.length} organization(s) visible:`);
  orgs.forEach((o) => console.log(`   - ${o.organization_id}  ${o.name}  (${o.currency_code})`));
  console.log(`Configured ZOHO_ORGANIZATION_ID = ${zohoConfig.organizationId}`);
  process.exit(0);
})().catch((err) => {
  console.error(`\u274c Zoho ping failed: ${err.message}`);
  if (err.details) console.error(JSON.stringify(err.details, null, 2));
  process.exit(1);
});
