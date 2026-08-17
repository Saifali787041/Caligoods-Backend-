'use strict';
const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Caligoods Enterprise Platform API',
      version: '1.0.0',
      description: 'Backend API for the Caligoods Enterprise B2B/B2C platform. Phase 1: Authentication.',
    },
    servers: [{ url: env.APP_URL }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
