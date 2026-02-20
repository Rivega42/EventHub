import fs from 'fs/promises';
import path from 'path';
import pool from './pool';

async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  // Create migrations table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Get executed migrations
  const { rows: executed } = await pool.query<{ name: string }>(
    'SELECT name FROM migrations ORDER BY name'
  );
  const executedSet = new Set(executed.map((r) => r.name));

  // Get migration files
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${sqlFiles.length} migration files`);
  console.log(`Already executed: ${executedSet.size} migrations`);

  // Run pending migrations
  for (const file of sqlFiles) {
    if (executedSet.has(file)) {
      console.log(`✓ ${file} (already executed)`);
      continue;
    }

    console.log(`Running ${file}...`);
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✓ ${file} executed successfully`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`✗ ${file} failed:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('All migrations completed');
}

runMigrations()
  .then(() => {
    console.log('Migration process finished');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
