'use strict';
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const { RefreshToken } = require('../models');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role ? user.role.name : undefined },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );

const parseDurationToMs = (str) => {
  const m = /^(\d+)([smhd])$/.exec(String(str));
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(m[1]) * units[m[2]];
};

const generateRefreshToken = async (user, ip) => {
  const raw = `${uuidv4()}.${crypto.randomBytes(40).toString('hex')}`;
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN));
  await RefreshToken.create({ userId: user.id, tokenHash: hashToken(raw), expiresAt, createdByIp: ip });
  return raw;
};

const findActiveRefreshToken = async (raw) => {
  const record = await RefreshToken.findOne({ where: { tokenHash: hashToken(raw) } });
  if (!record || !record.isActive()) return null;
  return record;
};

const rotateRefreshToken = async (oldRecord, user, ip) => {
  const newRaw = await generateRefreshToken(user, ip);
  oldRecord.revokedAt = new Date();
  oldRecord.replacedByTokenHash = hashToken(newRaw);
  await oldRecord.save();
  return newRaw;
};

const revokeRefreshToken = async (raw) => {
  const record = await RefreshToken.findOne({ where: { tokenHash: hashToken(raw) } });
  if (record && !record.revokedAt) {
    record.revokedAt = new Date();
    await record.save();
  }
};

module.exports = {
  hashToken, generateAccessToken, generateRefreshToken,
  findActiveRefreshToken, rotateRefreshToken, revokeRefreshToken,
};
