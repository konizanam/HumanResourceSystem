import { Pool, type QueryResultRow } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/hito_hr",
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
