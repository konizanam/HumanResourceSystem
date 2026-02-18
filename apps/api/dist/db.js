"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.getClient = getClient;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/hito_hr",
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
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