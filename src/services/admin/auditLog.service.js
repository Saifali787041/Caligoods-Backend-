'use strict';
const { AuditLog, User, Role } = require('../../models');
const logger = require('../../config/logger');

// Best-effort: an audit write must never break the primary action.
async function record({ actorId, action, targetType, targetId, meta, ip }) {
  try {
    await AuditLog.create({ actorId, action, targetType, targetId, meta: meta || null, ip });
  } catch (err) {
    logger.warn(`Audit log write failed (${action}): ${err.message}`);
  }
}

async function list(query = {}) {
  const page = Number(query.page) || 1;
  const perPage = Math.min(Number(query.per_page) || 25, 200);
  const where = {};
  if (query.action) where.action = query.action;
  if (query.actorId) where.actorId = query.actorId;

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [{
      model: User, as: 'actor',
      attributes: ['id', 'firstName', 'lastName', 'email'],
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
    }],
    order: [['createdAt', 'DESC']],
    limit: perPage,
    offset: (page - 1) * perPage,
  });

  return {
    logs: rows,
    meta: { page, per_page: perPage, total: count, total_pages: Math.ceil(count / perPage) },
  };
}

module.exports = { record, list };
