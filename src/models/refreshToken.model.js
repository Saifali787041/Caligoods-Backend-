'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING, allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    replacedByTokenHash: { type: DataTypes.STRING, allowNull: true },
    createdByIp: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'refresh_tokens' });

  RefreshToken.prototype.isActive = function isActive() {
    return !this.revokedAt && this.expiresAt > new Date();
  };

  return RefreshToken;
};
