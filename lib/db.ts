import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;

export function getDb(): ReturnType<typeof postgres> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL environment variable is not set');
    _sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: 'require',
    });
  }
  return _sql;
}
