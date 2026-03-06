/**
 * Main application entry point
 * This file starts the server
 */

import app from './app';
import dotenv from 'dotenv';
import path from 'path';
import { query } from './config/database';

// Load environment variables (only in development — production uses platform env vars)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function ensureSchema() {
  // Ensure companies.status exists for activate/deactivate.
  await query(
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'",
  );

  // New users should be inactive by default until email activation.
  // (Registration explicitly sets is_active too, but this helps fresh DB setups.)
  await query(
    "ALTER TABLE users ALTER COLUMN is_active SET DEFAULT FALSE",
  );

  // Store user profile pictures directly in DB.
  await query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_data BYTEA",
  );
  await query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_mime VARCHAR(100)",
  );
  await query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_updated_at TIMESTAMP",
  );
}

async function start() {
  await ensureSchema();

  // Start the server
  const server = app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🚀 Server started successfully!');
    console.log('=================================');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API v1: http://localhost:${PORT}/api/v1/health`);
      console.log(`📄 Swagger docs at http://localhost:${PORT}/docs`);
    console.log('=================================\n');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  return server;
}

const serverPromise = start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

export default serverPromise;