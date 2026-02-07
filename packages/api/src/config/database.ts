import { createPool } from 'mysql2/promise';
import { env } from './env';

export const pool = createPool({
  host: env.mysqlHost,
  port: env.mysqlPort,
  user: env.mysqlUser,
  password: env.mysqlPassword,
  database: env.mysqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

export async function connectToDatabase() {
  // Warm up the pool and fail fast if credentials are wrong.
  await pool.query('SELECT 1');
  return pool;
}
