import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

const DB_NAME = 'puf-analyzer.db';
const SCHEMA_PATHS = [
  'schema.sql',
  join('..', '..', 'src', 'database', 'schema.sql')
];

const INLINE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    device_type TEXT,
    status TEXT DEFAULT 'active',
    readings_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS puf_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    binary_data TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_extension TEXT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_puf_readings_device_id ON puf_readings(device_id);
  CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(name);
  CREATE INDEX IF NOT EXISTS idx_puf_readings_filename ON puf_readings(filename);
  
  CREATE TRIGGER IF NOT EXISTS update_device_readings_count_insert
  AFTER INSERT ON puf_readings
  BEGIN
    UPDATE devices SET readings_count = (
      SELECT COUNT(*) FROM puf_readings WHERE device_id = NEW.device_id
    ) WHERE id = NEW.device_id;
  END;
  
  CREATE TRIGGER IF NOT EXISTS update_device_readings_count_delete
  AFTER DELETE ON puf_readings
  BEGIN
    UPDATE devices SET readings_count = (
      SELECT COUNT(*) FROM puf_readings WHERE device_id = OLD.device_id
    ) WHERE id = OLD.device_id;
  END;
`;

let db: Database.Database | null = null;

const configureDatabase = (database: Database.Database): void => {
  database.exec('PRAGMA foreign_keys = ON;');
};

const initializeSchema = (database: Database.Database): void => {
  for (const relativePath of SCHEMA_PATHS) {
    const schemaPath = join(__dirname, relativePath);
    if (existsSync(schemaPath)) {
      const schema = readFileSync(schemaPath, 'utf8');
      database.exec(schema);
      return;
    }
  }
  
  database.exec(INLINE_SCHEMA);
};

export const initDatabase = (): Database.Database => {
  if (db) {
    return db;
  }

  const dbPath = join(app.getPath('userData'), DB_NAME);
  db = new Database(dbPath);

  configureDatabase(db);
  initializeSchema(db);

  return db;
};

export const getDatabase = (): Database.Database => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};

export const executeQuery = <T = Record<string, unknown>>(query: string, params?: unknown[]): T[] => {
  try {
    const database = getDatabase();
    const statement = database.prepare(query);
    return params ? statement.all(params) as T[] : statement.all() as T[];
  } catch (error) {
    throw new Error(`Database query failed: ${error}`);
  }
};

export const executeStatement = (query: string, params?: unknown[]): Database.RunResult => {
  try {
    const database = getDatabase();
    const statement = database.prepare(query);
    return params ? statement.run(params) : statement.run();
  } catch (error) {
    throw new Error(`Database statement failed: ${error}`);
  }
};

export const resetDatabase = (): void => {
  const database = getDatabase();
  
  database.exec('DROP TABLE IF EXISTS puf_readings');
  database.exec('DROP TABLE IF EXISTS devices');
  
  database.exec(INLINE_SCHEMA);
};