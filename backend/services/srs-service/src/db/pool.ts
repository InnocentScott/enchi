import { Pool } from 'pg';

let pool: Pool | undefined;

export function initPool(connectionString: string): Pool {
  pool = new Pool({ connectionString });
  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error('pool not initialised');
  return pool;
}
