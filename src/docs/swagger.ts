import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ZAXI VTC Backend API Documentation',
    version: '1.0.0',
    description: 'Production-grade ride-hailing backend API for ZAXI - Bordj Bou Arréridj, Algeria.',
    contact: {
      name: 'ZAXI Engineering',
      email: 'support@zaxi.dz',
    },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local Development Server' },
    { url: 'https://api.zaxi.dz', description: 'Production Server' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        responses: {
          200: { description: 'Server operational' },
        },
      },
    },
    '/ready': {
      get: {
        summary: 'Deployment readiness probe',
        responses: {
          200: { description: 'Database and server ready' },
        },
      },
    },
    '/api/auth/request-code': {
      post: {
        summary: 'Request SMS OTP verification code',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { phone: { type: 'string', example: '+213555123456' } },
                required: ['phone'],
              },
            },
          },
        },
        responses: { 200: { description: 'OTP sent via SMS' } },
      },
    },
    '/api/auth/verify-code': {
      post: {
        summary: 'Verify OTP code and authenticate',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  phone: { type: 'string', example: '+213555123456' },
                  code: { type: 'string', example: '123456' },
                },
                required: ['phone', 'code'],
              },
            },
          },
        },
        responses: { 200: { description: 'Returns JWT token' } },
      },
    },
    '/api/customers/me': {
      get: {
        summary: 'Get customer profile and trip stats',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Customer profile object' } },
      },
    },
    '/api/customers/bookings': {
      get: {
        summary: 'List customer bookings',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Paginated customer bookings list' } },
      },
    },
    '/api/customers/favorites': {
      post: {
        summary: 'Create favorite location',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Favorite created' } },
      },
    },
    '/api/driver/bookings': {
      get: {
        summary: 'Get driver dashboard bookings',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Driver bookings list' } },
      },
    },
    '/api/admin/statistics': {
      get: {
        summary: 'Get platform analytics & financial metrics',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Platform statistics object' } },
      },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
