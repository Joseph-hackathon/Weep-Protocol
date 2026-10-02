import Database from 'better-sqlite3';
import path from 'path';

// Create a local SQLite database file in the project root
const db = new Database(path.join(process.cwd(), 'weep.db'), { verbose: console.log });

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS policies (
    id TEXT PRIMARY KEY,
    merchant TEXT,
    roles TEXT, -- JSON string
    eligibility TEXT,
    status TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tip_pools (
    id TEXT PRIMARY KEY,
    merchant TEXT,
    amount REAL,
    status TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entitlements (
    id TEXT PRIMARY KEY,
    tipPoolId TEXT,
    worker TEXT,
    role TEXT,
    amount REAL,
    verified BOOLEAN,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
