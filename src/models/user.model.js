'use strict';
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false },
    roleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    emailVerificationTokenHash: { type: DataTypes.STRING, allowNull: true },
    emailVerificationExpires: { type: DataTypes.DATE, allowNull: true },
    passwordResetTokenHash: { type: DataTypes.STRING, allowNull: true },
    passwordResetExpires: { type: DataTypes.DATE, allowNull: true },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'users',
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('email') && user.email) user.email = user.email.toLowerCase().trim();
        if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
      },
    },
  });

  User.prototype.comparePassword = function comparePassword(candidate) {
    return bcrypt.compare(candidate, this.password);
  };

  User.prototype.toSafeJSON = function toSafeJSON() {
    const obj = this.toJSON();
    delete obj.password;
    delete obj.emailVerificationTokenHash;
    delete obj.emailVerificationExpires;
    delete obj.passwordResetTokenHash;
    delete obj.passwordResetExpires;
    return obj;
  };

  return User;
};
