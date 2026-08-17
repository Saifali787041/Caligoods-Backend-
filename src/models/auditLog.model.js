'use strict';
const { DataTypes } = require('sequelize');

// Immutable record of privileged admin actions (who did what, to whom, when).
module.exports = (sequelize) => sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  actorId: { type: DataTypes.UUID, allowNull: true },       // null = system
  action: { type: DataTypes.STRING, allowNull: false },      // e.g. user.create
  targetType: { type: DataTypes.STRING, allowNull: true },   // e.g. user
  targetId: { type: DataTypes.STRING, allowNull: true },
  meta: { type: DataTypes.JSON, allowNull: true },
  ip: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'audit_logs',
  updatedAt: false, // append-only
});
