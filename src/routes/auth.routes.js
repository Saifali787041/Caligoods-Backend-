'use strict';
const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const authValidation = require('../validations/auth.validation');
const { authenticate } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication & account management
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new customer account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName: { type: string, example: Jane }
 *               lastName:  { type: string, example: Doe }
 *               email:     { type: string, example: jane@example.com }
 *               password:  { type: string, example: Str0ngPass }
 *     responses:
 *       201: { description: Registered; returns user + tokens }
 *       409: { description: Email already registered }
 *       422: { description: Validation failed }
 */
router.post('/register', authLimiter, validate(authValidation.register), authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive access + refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: jane@example.com }
 *               password: { type: string, example: Str0ngPass }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authLimiter, validate(authValidation.login), authController.login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a refresh token for a new access + refresh token (rotation)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New tokens issued }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh', validate(authValidation.refresh), authController.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', validate(authValidation.refresh), authController.logout);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties: { email: { type: string } }
 *     responses:
 *       200: { description: Always returns success (no user enumeration) }
 */
router.post('/forgot-password', authLimiter, validate(authValidation.forgotPassword), authController.forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using the emailed token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:    { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Password reset }
 *       400: { description: Invalid or expired token }
 */
router.post('/reset-password', authLimiter, validate(authValidation.resetPassword), authController.resetPassword);

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email using the emailed token
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Invalid or expired token }
 */
router.post('/verify-email', validate(authValidation.verifyEmail), authController.verifyEmail);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Unauthorized }
 */
router.get('/me', authenticate, authController.me);

module.exports = router;
