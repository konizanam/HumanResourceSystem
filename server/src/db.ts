import { Pool, type QueryResultRow } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const hasDbParts =
  Boolean(process.env.DB_HOST) &&
  Boolean(process.env.DB_PORT) &&
  Boolean(process.env.DB_NAME) &&
  Boolean(process.env.DB_USER) &&
  Boolean(process.env.DB_PASSWORD);

if (!hasDatabaseUrl && !hasDbParts) {
  throw new Error(
    "Database configuration missing in .env. Set DATABASE_URL or DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD."
  );
}

const pool = new Pool({
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
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("Unexpected PG pool error", err);
});

/** Run a single query. */
export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}

/** Get a client from the pool (for transactions). */
export function getClient() {
  return pool.connect();
}

export default pool;
