import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,               // serverless: never hold more than 1 connection per instance
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 20_000, // CockroachDB Serverless can take ~10-15 s to wake from zero
  keepAlive: true,                 // prevent firewalls/LBs from silently dropping idle connections
  keepAliveInitialDelayMillis: 10_000,
});

export default pool;
