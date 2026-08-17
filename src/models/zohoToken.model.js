'use strict';
const { DataTypes } = require('sequelize');

// Single-row cache (id = 1) so multiple app instances can share one live
// access token instead of each hammering Zoho's token endpoint. The long-lived
// refresh token and client secret NEVER live here - they stay in .env only.
module.exports = (sequelize) => sequelize.define('ZohoToken', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, defaultValue: 1 },
  accessToken: { type: DataTypes.TEXT, allowNull: false },
  apiDomain: { type: DataTypes.STRING, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'zoho_tokens' });
