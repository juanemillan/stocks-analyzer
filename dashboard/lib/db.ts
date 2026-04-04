import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,               // serverless: never hold more than 1 connection per instance
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
});

export default pool;
