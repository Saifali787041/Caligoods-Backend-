'use strict';
const axios = require('axios');
const zohoConfig = require('../config/zoho');
const logger = require('../config/logger');
const ApiError = require('../helpers/apiError');
const { ZohoToken } = require('../models');

/**
 * Manages the lifecycle of the Zoho access token.
 *
 *  - Access tokens are cached in memory (and best-effort in MySQL) and reused
 *    until ~2 minutes before expiry, to respect Zoho's 10-tokens/10-min cap.
 *  - A single in-flight refresh promise (mutex) prevents a "thundering herd"
 *    where concurrent requests all trigger a refresh at once.
 *  - The refresh token / client secret are read from env only, never returned
 *    to any caller and never sent to the frontend.
 */

let cache = { accessToken: null, apiDomain: null, expiresAt: 0 };
let refreshPromise = null;

const isFresh = (state) =>
  state && state.accessToken && Date.now() < state.expiresAt - zohoConfig.refreshSkewMs;

async function persist(state) {
  try {
    await ZohoToken.upsert({
      id: 1,
      accessToken: state.accessToken,
      apiDomain: state.apiDomain,
      expiresAt: new Date(state.expiresAt),
    });
  } catch (err) {
    logger.warn(`Zoho token persist skipped: ${err.message}`);
  }
}

async function loadPersisted() {
  try {
    const row = await ZohoToken.findByPk(1);
    if (!row) return null;
    return {
      accessToken: row.accessToken,
      apiDomain: row.apiDomain,
      expiresAt: new Date(row.expiresAt).getTime(),
    };
  } catch (err) {
    logger.warn(`Zoho token load skipped: ${err.message}`);
    return null;
  }
}

async function requestNewToken() {
  zohoConfig.assertConfigured();

  const url = `${zohoConfig.accountsUrl}/oauth/v2/token`;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: zohoConfig.clientId,
    client_secret: zohoConfig.clientSecret,
    refresh_token: zohoConfig.refreshToken,
  }).toString();

  let res;
  try {
    res = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });
  } catch (err) {
    const detail = (err.response && err.response.data) || err.message;
    logger.error('Zoho token refresh request failed', { detail });
    throw new ApiError(502, 'Failed to reach Zoho token endpoint', detail, false);
  }

  const data = res.data || {};
  // Zoho returns { error: 'invalid_client' | 'invalid_code' | ... } on failure
  if (data.error || !data.access_token) {
    logger.error('Zoho token refresh rejected', { error: data.error });
    throw new ApiError(502, `Zoho OAuth error: ${data.error || 'no access_token returned'}`, data, false);
  }

  const next = {
    accessToken: data.access_token,
    apiDomain: (data.api_domain && data.api_domain.replace(/\/+$/, '')) || zohoConfig.apiDomain,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
  cache = next;
  await persist(next);
  logger.info('Zoho access token refreshed (valid ~1h)');
  return next;
}

async function getState() {
  if (isFresh(cache)) return cache;

  // Cold start / another instance may already hold a valid token.
  if (!cache.accessToken) {
    const loaded = await loadPersisted();
    if (isFresh(loaded)) {
      cache = loaded;
      return cache;
    }
  }

  // Collapse concurrent refreshes into one network call.
  if (!refreshPromise) {
    refreshPromise = requestNewToken().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function getAccessToken() { return (await getState()).accessToken; }
async function getApiDomain() { return (await getState()).apiDomain; }

// Force the next call to fetch a new token (used after a 401 from Zoho).
function invalidate() { cache = { accessToken: null, apiDomain: cache.apiDomain, expiresAt: 0 }; }

module.exports = { getAccessToken, getApiDomain, invalidate, _cache: () => cache };
