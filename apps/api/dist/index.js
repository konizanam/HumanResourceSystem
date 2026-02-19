"use strict";
/**
 * Main application entry point
 * This file starts the server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
async function ensureSchema() {
    // Ensure companies.status exists for activate/deactivate.
    await (0, database_1.query)("ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'");
    // New users should be inactive by default until email activation.
    // (Registration explicitly sets is_active too, but this helps fresh DB setups.)
    await (0, database_1.query)("ALTER TABLE users ALTER COLUMN is_active SET DEFAULT FALSE");
}
async function start() {
    await ensureSchema();
    // Start the server
    const server = app_1.default.listen(PORT, () => {
        console.log('\n=================================');
        console.log('🚀 Server started successfully!');
        console.log('=================================');
        console.log(`📡 Port: ${PORT}`);
        console.log(`🌍 Environment: ${NODE_ENV}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        console.log(`🔗 API v1: http://localhost:${PORT}/api/v1/health`);
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
exports.default = serverPromise;
//# sourceMappingURL=index.js.map