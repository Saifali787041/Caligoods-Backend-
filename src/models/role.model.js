'use strict';
const { DataTypes } = require('sequelize');
const { ROLE_LIST } = require('../helpers/constants');

module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.ENUM(...ROLE_LIST), allowNull: false, unique: true },
    description: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'roles' });

  return Role;
};
