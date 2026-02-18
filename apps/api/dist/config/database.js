"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transaction = exports.query = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}
// Create pool configuration
const poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
console.log('📊 Database configuration:', {
    ...poolConfig,
    password: '********'
});
// Create the pool
exports.pool = new pg_1.Pool(poolConfig);
// Test the connection on startup
exports.pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error acquiring client from pool:', err.stack);
        return;
    }
    console.log('✅ Connected to PostgreSQL database successfully');
    release();
});
// Handle pool errors
exports.pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client:', err);
    process.exit(-1);
});
// Query helper function with error handling
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await exports.pool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 100) {
            console.warn('⚠️ Slow query:', { text, duration, rows: res.rowCount });
        }
        else {
            console.log('📝 Query executed:', { text, duration, rows: res.rowCount });
        }
        return res;
    }
    catch (error) {
        console.error('❌ Query error:', { text, error });
        throw error;
    }
};
exports.query = query;
// Transaction helper
const transaction = async (callback) => {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.transaction = transaction;
exports.default = {
    pool: exports.pool,
    query: exports.query,
    transaction: exports.transaction
};
//# sourceMappingURL=database.js.map