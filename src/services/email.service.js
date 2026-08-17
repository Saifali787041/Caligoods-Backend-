'use strict';
const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

let transporter;
if (env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: (env.SMTP_PORT || 587) === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
} else {
  // Dev fallback: log emails instead of sending them.
  transporter = {
    sendMail: async (opts) => {
      logger.info(`[email:dev] To: ${opts.to} | Subject: ${opts.subject}\n${opts.text}`);
      return { messageId: 'dev-console' };
    },
  };
}

const send = (to, subject, text, html) =>
  transporter.sendMail({ from: env.SMTP_FROM, to, subject, text, html });

const sendVerificationEmail = (user, token) => {
  const link = `${env.CLIENT_URL}/verify-email?token=${token}`;
  return send(
    user.email,
    'Verify your Caligoods account',
    `Welcome ${user.firstName}. Verify your email: ${link}`,
    `<p>Welcome ${user.firstName},</p><p>Verify your email <a href="${link}">here</a>. Expires in ${env.VERIFY_TOKEN_EXPIRES_HOURS} hours.</p>`
  );
};

const sendPasswordResetEmail = (user, token) => {
  const link = `${env.CLIENT_URL}/reset-password?token=${token}`;
  return send(
    user.email,
    'Reset your Caligoods password',
    `Reset your password: ${link}`,
    `<p>Hi ${user.firstName},</p><p>Reset your password <a href="${link}">here</a>. Expires in ${env.RESET_TOKEN_EXPIRES_MIN} minutes. If you didn't request this, ignore this email.</p>`
  );
};

const sendInvitationEmail = (user, token) => {
  const link = `${env.CLIENT_URL}/accept-invite?token=${token}`;
  return send(
    user.email,
    'You have been invited to Caligoods',
    `Hi ${user.firstName}, set your password to activate your account: ${link}`,
    `<p>Hi ${user.firstName},</p><p>An administrator created a Caligoods account for you. ` +
    `<a href="${link}">Set your password</a> to activate it. This invite expires in 72 hours.</p>`
  );
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendInvitationEmail };
