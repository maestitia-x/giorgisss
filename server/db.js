import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "..", "carkifelek.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS prizes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    special INTEGER DEFAULT 0,
    weight REAL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    assigned_prize TEXT DEFAULT '',
    added_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    participant_name TEXT NOT NULL,
    prize_name TEXT NOT NULL,
    special INTEGER DEFAULT 0,
    spun_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migration: add weight column if it doesn't exist (for existing DBs)
const prizeCols = db.prepare("PRAGMA table_info(prizes)").all();
if (!prizeCols.some(c => c.name === "weight")) {
  db.exec("ALTER TABLE prizes ADD COLUMN weight REAL DEFAULT 1");
}

export default db;
