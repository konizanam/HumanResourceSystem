"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.getClient = getClient;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, "../.env") });
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const hasDbParts = Boolean(process.env.DB_HOST) &&
    Boolean(process.env.DB_PORT) &&
    Boolean(process.env.DB_NAME) &&
    Boolean(process.env.DB_USER) &&
    Boolean(process.env.DB_PASSWORD);
if (!hasDatabaseUrl && !hasDbParts) {
    throw new Error("Database configuration missing in .env. Set DATABASE_URL or DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.");
}
const pool = new pg_1.Pool({
    ...(hasDatabaseUrl
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        }),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
pool.on("error", (err) => {
    console.error("Unexpected PG pool error", err);
});
/** Run a single query. */
function query(text, params) {
    return pool.query(text, params);
}
/** Get a client from the pool (for transactions). */
function getClient() {
    return pool.connect();
}
exports.default = pool;
//# sourceMappingURL=db.js.map