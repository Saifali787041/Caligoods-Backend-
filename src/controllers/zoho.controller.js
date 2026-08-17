'use strict';
const catchAsync = require('../utils/catchAsync');
const { success } = require('../helpers/apiResponse');
const zohoConfig = require('../config/zoho');
const zohoClient = require('../services/zohoClient.service');
const zohoToken = require('../services/zohoToken.service');

/**
 * Verifies the Zoho integration end-to-end by fetching organizations
 * (requires only ZohoInventory.settings.READ). Confirms that the refresh
 * token, client credentials, org id and scope all work - without exposing
 * any secret to the client.
 */
const status = catchAsync(async (req, res) => {
  zohoConfig.assertConfigured();
  const data = await zohoClient.get('/organizations');
  const organizations = (data.organizations || []).map((o) => ({
    organization_id: o.organization_id,
    name: o.name,
    currency_code: o.currency_code,
    time_zone: o.time_zone,
    is_default_org: o.is_default_org,
  }));

  return success(res, {
    message: 'Zoho Inventory connection OK',
    data: {
      configured: true,
      configuredOrganizationId: zohoConfig.organizationId,
      organizations,
    },
  });
});

/**
 * Lightweight connectivity check for development.
 * GET /api/zoho/test -> { success, zohoConnected, message }
 * Never returns any credential. Reports a clean 200 whether connected or not
 * so a simple frontend/dev probe can read the `zohoConnected` flag.
 */
const test = catchAsync(async (req, res) => {
  if (!zohoConfig.isConfigured()) {
    return res.status(200).json({
      success: false,
      zohoConnected: false,
      message: 'Zoho is not configured (missing client id / secret / refresh token / org id)',
    });
  }
  try {
    await zohoClient.get('/organizations');
    return res.status(200).json({
      success: true,
      zohoConnected: true,
      message: 'Zoho Inventory API connection successful',
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      zohoConnected: false,
      message: 'Zoho connection failed',
      status: err.statusCode || err.status || 502,
    });
  }
});

/** Reports config/token state without hitting Zoho (safe, no secrets). */
const health = catchAsync(async (req, res) => {
  const c = zohoToken._cache();
  return success(res, {
    message: 'Zoho integration status',
    data: {
      configured: zohoConfig.isConfigured(),
      apiDomain: zohoConfig.apiDomain,
      accountsUrl: zohoConfig.accountsUrl,
      hasCachedToken: Boolean(c.accessToken),
      tokenExpiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
    },
  });
});

module.exports = { status, health, test };
