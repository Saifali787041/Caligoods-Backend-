'use strict';
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Role } = require('../../models');
const ApiError = require('../../helpers/apiError');
const { ROLES } = require('../../helpers/constants');
const env = require('../../config/env');
const emailService = require('../email.service');
const audit = require('./auditLog.service');

const rawToken = () => crypto.randomBytes(32).toString('hex');
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const isSuper = (roleName) => roleName === ROLES.SUPER_ADMIN;

// --- policy guards ---
function assertCanManageRole(actorRole, targetRoleName) {
  if (isSuper(targetRoleName) && actorRole !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('Only a super admin can assign or modify the super_admin role');
  }
}
function assertCanActOn(actor, target) {
  const targetRole = target.role ? target.role.name : null;
  if (isSuper(targetRole) && actor.roleName !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('Only a super admin can modify a super admin account');
  }
}
async function resolveRole(roleName) {
  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) throw ApiError.badRequest(`Unknown role: ${roleName}`);
  return role;
}
async function activeSuperAdminCount() {
  return User.count({
    where: { isActive: true },
    include: [{ model: Role, as: 'role', where: { name: ROLES.SUPER_ADMIN }, required: true }],
  });
}
const withRole = (id) => User.findByPk(id, { include: [{ model: Role, as: 'role' }] });

// --- operations ---
async function list(query = {}) {
  const page = Number(query.page) || 1;
  const perPage = Math.min(Number(query.per_page) || 25, 200);
  const where = {};
  if (query.isActive === 'true' || query.isActive === 'false') where.isActive = query.isActive === 'true';
  if (query.search) {
    where[Op.or] = [
      { firstName: { [Op.like]: `%${query.search}%` } },
      { lastName: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
    ];
  }
  const include = [{ model: Role, as: 'role', ...(query.role ? { where: { name: query.role }, required: true } : {}) }];

  const { rows, count } = await User.findAndCountAll({
    where, include, order: [['createdAt', 'DESC']], limit: perPage, offset: (page - 1) * perPage,
  });
  return {
    users: rows.map((u) => u.toSafeJSON()),
    meta: { page, per_page: perPage, total: count, total_pages: Math.ceil(count / perPage) },
  };
}

async function get(id) {
  const user = await withRole(id);
  if (!user) throw ApiError.notFound('User not found');
  return user.toSafeJSON();
}

async function create(actor, payload, ip) {
  const { firstName, lastName, email, role: roleName, password, isActive = true } = payload;
  assertCanManageRole(actor.roleName, roleName);

  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) throw ApiError.conflict('Email is already registered');

  const role = await resolveRole(roleName);
  let inviteToken = null;
  const user = await User.create({
    firstName,
    lastName,
    email,
    roleId: role.id,
    isActive,
    // If no password is supplied, set an unusable random one and send an invite.
    password: password || rawToken(),
    isEmailVerified: Boolean(password), // password set directly => treat as verified
    ...(password ? {} : {
      passwordResetTokenHash: (inviteToken = rawToken(), hash(inviteToken)),
      passwordResetExpires: new Date(Date.now() + 72 * 3600 * 1000), // 72h invite window
    }),
  });
  user.role = role;

  if (!password && inviteToken) {
    await emailService.sendInvitationEmail(user, inviteToken);
  }

  await audit.record({
    actorId: actor.id, action: 'user.create', targetType: 'user', targetId: user.id,
    meta: { role: roleName, invited: !password }, ip,
  });
  return { user: user.toSafeJSON(), invited: !password };
}

async function update(actor, id, payload, ip) {
  const target = await withRole(id);
  if (!target) throw ApiError.notFound('User not found');
  assertCanActOn(actor, target);

  const changes = {};
  if (payload.firstName !== undefined) changes.firstName = payload.firstName;
  if (payload.lastName !== undefined) changes.lastName = payload.lastName;

  if (payload.role && payload.role !== (target.role && target.role.name)) {
    if (target.id === actor.id) throw ApiError.forbidden('You cannot change your own role');
    assertCanManageRole(actor.roleName, payload.role);           // assigning TO super_admin
    assertCanManageRole(actor.roleName, target.role.name);       // moving a super_admin
    const role = await resolveRole(payload.role);
    changes.roleId = role.id;
  }

  await target.update(changes);
  const fresh = await withRole(id);
  await audit.record({
    actorId: actor.id, action: 'user.update', targetType: 'user', targetId: id,
    meta: { changes: Object.keys(changes) }, ip,
  });
  return fresh.toSafeJSON();
}

async function setStatus(actor, id, isActive, ip) {
  const target = await withRole(id);
  if (!target) throw ApiError.notFound('User not found');
  assertCanActOn(actor, target);
  if (target.id === actor.id && !isActive) throw ApiError.badRequest('You cannot deactivate your own account');

  if (!isActive && isSuper(target.role && target.role.name)) {
    const supers = await activeSuperAdminCount();
    if (supers <= 1) throw ApiError.badRequest('Cannot deactivate the last active super admin');
  }

  await target.update({ isActive });
  await audit.record({
    actorId: actor.id, action: isActive ? 'user.activate' : 'user.deactivate',
    targetType: 'user', targetId: id, ip,
  });
  return { id, isActive };
}

async function resetPassword(actor, id, ip) {
  const target = await withRole(id);
  if (!target) throw ApiError.notFound('User not found');
  assertCanActOn(actor, target);

  const token = rawToken();
  await target.update({
    passwordResetTokenHash: hash(token),
    passwordResetExpires: new Date(Date.now() + env.RESET_TOKEN_EXPIRES_MIN * 60000),
  });
  await emailService.sendPasswordResetEmail(target, token);
  await audit.record({ actorId: actor.id, action: 'user.reset_password', targetType: 'user', targetId: id, ip });
  return { id, resetEmailSent: true };
}

async function remove(actor, id, ip) {
  const target = await withRole(id);
  if (!target) throw ApiError.notFound('User not found');
  if (target.id === actor.id) throw ApiError.badRequest('You cannot delete your own account');
  assertCanActOn(actor, target);

  if (isSuper(target.role && target.role.name)) {
    const supers = await activeSuperAdminCount();
    if (supers <= 1) throw ApiError.badRequest('Cannot delete the last super admin');
  }
  await target.destroy();
  await audit.record({ actorId: actor.id, action: 'user.delete', targetType: 'user', targetId: id, ip });
  return { id, deleted: true };
}

module.exports = { list, get, create, update, setStatus, resetPassword, remove };
