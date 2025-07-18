import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

let db: Database.Database | null = null;

export const initDatabase = (): Database.Database => {
  if (db) {
    return db;
  }

  const dbPath = join(app.getPath('userData'), 'puf-analyzer.db');
  db = new Database(dbPath);

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Read and execute schema
  let schemaPath = join(__dirname, 'schema.sql');
  
  // Try different paths for development vs production
  if (!existsSync(schemaPath)) {
    schemaPath = join(__dirname, '..', '..', 'src', 'database', 'schema.sql');
  }
  
  if (!existsSync(schemaPath)) {
    // If schema file doesn't exist, create tables inline
    console.log('Schema file not found, creating tables inline');
    db.exec(`
      -- Devices table
      CREATE TABLE IF NOT EXISTS devices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          device_type TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Files table
      CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          device_id INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_files_device_id ON files(device_id);
      CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(name);
    `);
  } else {
    const schema = readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  }

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

export const executeQuery = (query: string, params?: any[]): any => {
  try {
    const database = getDatabase();
    const statement = database.prepare(query);
    
    if (params) {
      return statement.all(params);
    } else {
      return statement.all();
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const executeStatement = (query: string, params?: any[]): Database.RunResult => {
  try {
    const database = getDatabase();
    const statement = database.prepare(query);
    
    if (params) {
      return statement.run(params);
    } else {
      return statement.run();
    }
  } catch (error) {
    console.error('Database statement error:', error);
    throw error;
  }
};