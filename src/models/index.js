'use strict';
const sequelize = require('../config/database');
const UserModel = require('./user.model');
const RoleModel = require('./role.model');
const RefreshTokenModel = require('./refreshToken.model');
const ZohoTokenModel = require('./zohoToken.model');
const AuditLogModel = require('./auditLog.model');

const User = UserModel(sequelize);
const Role = RoleModel(sequelize);
const RefreshToken = RefreshTokenModel(sequelize);
const ZohoToken = ZohoTokenModel(sequelize);
const AuditLog = AuditLogModel(sequelize);

// Associations
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(AuditLog, { foreignKey: 'actorId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

module.exports = { sequelize, User, Role, RefreshToken, ZohoToken, AuditLog };
