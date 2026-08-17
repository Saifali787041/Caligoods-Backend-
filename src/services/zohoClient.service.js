'use strict';
const axios = require('axios');
const zohoConfig = require('../config/zoho');
// Token provider: default OAuth (Self Client). Set ZOHO_AUTH_MODE=connection to
// use the Zoho Catalyst connection "inventory_api" instead (Catalyst only).
const zohoToken = (process.env.ZOHO_AUTH_MODE || 'oauth').toLowerCase() === 'connection'
  ? require('./zohoConnectionToken.service')
  : require('./zohoToken.service');
const ApiError = require('../helpers/apiError');
const logger = require('../config/logger');

/**
 * Thin Zoho Inventory REST client.
 *
 *  - Injects the base URL ({api_domain}/inventory/v1), the Zoho-oauthtoken
 *    auth header and the organization_id on every request.
 *  - On a 401 (expired/invalid token) it invalidates the cached token,
 *    refreshes once, and retries the original request a single time.
 *  - Normalizes Zoho errors into the app's ApiError shape (incl. 429 rate limit).
 */

const client = axios.create({ timeout: 20000 });

client.interceptors.request.use(async (config) => {
  const [token, apiDomain] = await Promise.all([
    zohoToken.getAccessToken(),
    zohoToken.getApiDomain(),
  ]);
  config.baseURL = `${apiDomain}${zohoConfig.inventoryPath}`;
  config.headers = config.headers || {};
  config.headers.Authorization = `Zoho-oauthtoken ${token}`;
  config.headers['X-com-zoho-inventory-organizationid'] = zohoConfig.organizationId;
  config.params = { organization_id: zohoConfig.organizationId, ...(config.params || {}) };
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const status = error.response && error.response.status;

    if (status === 401 && !config.__isRetry) {
      config.__isRetry = true;
      logger.warn('Zoho returned 401 - refreshing access token and retrying once');
      zohoToken.invalidate();
      return client(config);
    }
    throw mapZohoError(error);
  }
);

function mapZohoError(error) {
  if (error instanceof ApiError) return error;
  const response = error.response;
  if (!response) {
    return new ApiError(502, `Zoho request failed: ${error.message}`, null, false);
  }
  const status = response.status;
  const body = response.data || {};
  const message = body.message || 'Zoho API error';

  if (status === 429) {
    return new ApiError(429, 'Zoho API rate limit reached. Please retry shortly.', body);
  }
  if (status === 401) {
    return ApiError.unauthorized(`Zoho authentication failed: ${message}`);
  }
  if (status === 404) {
    return ApiError.notFound(`Zoho: ${message}`);
  }
  // 4xx from Zoho are usually caller errors; surface as-is. 5xx -> 502.
  return new ApiError(status >= 500 ? 502 : status, `Zoho: ${message}`, body, false);
}

/** Unwrap a Zoho list/detail body and guard against code != 0 on a 2xx. */
function unwrap(data) {
  if (data && typeof data.code === 'number' && data.code !== 0) {
    throw new ApiError(400, `Zoho: ${data.message || 'request rejected'}`, data);
  }
  return data;
}

const get = async (path, params) => unwrap((await client.get(path, { params })).data);
const post = async (path, data, params) => unwrap((await client.post(path, data, { params })).data);
const put = async (path, data, params) => unwrap((await client.put(path, data, { params })).data);
const del = async (path, params) => unwrap((await client.delete(path, { params })).data);

/**
 * Fetch raw binary (e.g. an item image) using the same authenticated client.
 * Reuses the existing token / organization interceptors — no new client.
 * Returns the bytes plus the upstream content-type; throws on 404 (no image).
 */
const getBinary = async (path, params) => {
  const res = await client.get(path, { params, responseType: 'arraybuffer' });
  return { data: Buffer.from(res.data), contentType: res.headers['content-type'] || 'image/jpeg' };
};

/**
 * Fetch every page of a Zoho list endpoint.
 * @param {string} path   e.g. '/items'
 * @param {string} listKey  the array key in the response, e.g. 'items'
 */
async function getAll(path, listKey, params = {}) {
  const out = [];
  let page = 1;
  // Zoho caps per_page at 200 for most list endpoints.
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const data = await get(path, { page, per_page: 200, ...params });
    out.push(...(data[listKey] || []));
    const ctx = data.page_context;
    if (!ctx || !ctx.has_more_page) break;
    page += 1;
  }
  return out;
}

module.exports = { get, post, put, del, getBinary, getAll, unwrap };
