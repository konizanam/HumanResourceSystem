/**
 * Express application configuration
 * This file sets up middleware, routes, and error handling
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { createOpenApiSpec } from './swagger';
import { crudAuditMiddleware } from './middleware/crudAudit';
import { visitorTrackingMiddleware } from './middleware/visitorTracking';

// Load environment variables (only in development — production uses platform env vars)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

// Create Express application
const app: Application = express();

// Needed for correct client IP when behind a proxy/load balancer
app.set('trust proxy', true);

function parseOrigins(raw: string | undefined): string[] {
  const value = String(raw ?? '').trim();
  if (!value) return ['http://localhost:5173'];
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const allowedWebOrigins = parseOrigins(process.env.WEB_ORIGIN);

// =====================
// Middleware
// =====================

// Security middleware
app.use(
  helmet({
    // Default is `same-origin`, which can block loading images (e.g. company logos)
    // from the API when the web app runs on a different origin during development.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Allow document iframe previews from configured web origins.
    frameguard: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'frame-ancestors': ["'self'", ...allowedWebOrigins],
      },
    },
  })
);

// CORS configuration
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, '');
    if (allowedWebOrigins.includes(normalized)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Static file serving — placed AFTER CORS/Helmet so uploads are served with proper
// cross-origin headers, allowing the browser to fetch documents from the API origin.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const origin = req.headers.origin ?? 'no-origin';
  console.log(`[${timestamp}] ${req.method} ${req.path} | origin: ${origin}`);
  res.on('finish', () => {
    console.log(`[${timestamp}] ${req.method} ${req.path} → ${res.statusCode}`);
  });
  next();
});

// Centralized audit logging for successful CRUD operations
app.use(visitorTrackingMiddleware);
app.use(crudAuditMiddleware);

// =====================
// Health Check Endpoints
// =====================

// Root health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API v1 health check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'API v1 is running',
    timestamp: new Date().toISOString()
  });
});

// =====================
// Routes
// =====================

// Import routes (uncomment as you add them)
import routes from './routes/index';

// Use routes
app.use('/api/v1', routes);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(createOpenApiSpec()));

// =====================
// 404 Handler
// =====================

app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.method} ${req.originalUrl} on this server`
  });
});

// =====================
// Error Handling Middleware
// =====================

interface ErrorWithStatus extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

app.use((err: ErrorWithStatus, req: Request, res: Response, next: NextFunction) => {
  const { NODE_ENV } = process.env;
  const statusCode = err.isOperational ? (err.statusCode || 400) : 500;
  
  // Log only unexpected/server errors loudly.
  // Expected operational 4xx errors (e.g. auth failures) can happen during dev refreshes.
  if (statusCode >= 500) {
    console.error('❌ Error:', {
      message: err.message,
      stack: NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  } else if (statusCode !== 401 && statusCode !== 403) {
    console.log('⚠️ Request rejected:', {
      statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  // Operational errors (known errors we created)
  if (err.isOperational) {
    return res.status(statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Programming or unknown errors
  res.status(500).json({
    status: 'error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app;