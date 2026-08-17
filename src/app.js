'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
// Gzip responses — big win for the large catalog JSON. Optional require so the
// app still boots if the package isn't installed yet (run `npm install`).
try { const compression = require('compression'); app.use(compression()); } catch (e) { /* optional */ }

// CLIENT_URL may be a comma-separated list so the admin frontend AND the
// storefront (both on Vercel) are both allowed. Requests with no Origin
// (curl, health checks, same-origin) are allowed through as well.
const allowedOrigins = env.CLIENT_URL.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: logger.stream }));

// API docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// Rate-limited API routes
app.use('/api', apiLimiter, routes);

// 404 + centralized error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
