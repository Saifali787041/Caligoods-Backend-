'use strict';
const zohoConfig = require('../config/zoho');
const logger = require('../config/logger');
const ApiError = require('../helpers/apiError');

/**
 * Obtains a Zoho Inventory access token using the Zoho Catalyst CONNECTION
 * you provided:
 *
 *   { connectionLinkName: "inventory_api", serviceName: "zoho_inventory", ... }
 *
 * IMPORTANT: A Zoho "connection" only works when this backend runs INSIDE Zoho
 * Catalyst (serverless functions). Catalyst issues the token for you, so no
 * client secret / refresh token is needed here. On a normal server (Render,
 * Railway, VPS) this cannot work — keep ZOHO_AUTH_MODE=oauth there.
 *
 * Same public interface as zohoToken.service.js, so zohoClient can use either.
 */

const CONNECTION_LINK = process.env.ZOHO_CONNECTION_NAME || 'inventory_api';
let cache = { accessToken: null, expiresAt: 0 };

function getCatalystApp() {
  let catalyst;
  try {
    // Lazy require so the app still boots in OAuth mode without this package.
    catalyst = require('zcatalyst-sdk-node');
  } catch (e) {
    throw new ApiError(500,
      'Connection mode needs zcatalyst-sdk-node. Run `npm i zcatalyst-sdk-node` and deploy on Zoho Catalyst. On a normal server use ZOHO_AUTH_MODE=oauth.',
      null, false);
  }
  // Catalyst must be initialized per request. A middleware should set this:
  //   app.use((req,res,next)=>{ global.__CATALYST_APP__ = catalyst.initialize(req); next(); });
  const cApp = global.__CATALYST_APP__;
  if (!cApp) {
    throw new ApiError(500,
      'Catalyst app not initialized. Add the catalyst.initialize(req) middleware, and only run connection mode inside Zoho Catalyst.',
      null, false);
  }
  return cApp;
}

async function requestNewToken() {
  const cApp = getCatalystApp();
  // Catalyst Connection SDK: get a connector by its link name, then its token.
  const connection = cApp.connection([CONNECTION_LINK]);
  const connector = connection.getConnector(CONNECTION_LINK);
  const accessToken = await connector.getAccessToken();
  if (!accessToken) throw new ApiError(502, 'Catalyst connection returned no access token', null, false);
  cache = { accessToken, expiresAt: Date.now() + 55 * 60 * 1000 };
  logger.info(`Zoho access token obtained via Catalyst connection "${CONNECTION_LINK}"`);
  return cache;
}

async function getAccessToken() {
  if (cache.accessToken && Date.now() < cache.expiresAt - zohoConfig.refreshSkewMs) return cache.accessToken;
  return (await requestNewToken()).accessToken;
}
async function getApiDomain() { return zohoConfig.apiDomain; }
function invalidate() { cache = { accessToken: null, expiresAt: 0 }; }

module.exports = { getAccessToken, getApiDomain, invalidate, _cache: () => cache };
