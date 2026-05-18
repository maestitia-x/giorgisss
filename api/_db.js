import { createClient } from "@libsql/client";

let db;

export function getDB() {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return db;
}

export async function initDB() {
  const db = getDB();
  await db.executeMultiple(`
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
  // Migration: add weight column for pre-existing DBs
  try {
    const info = await db.execute("PRAGMA table_info(prizes)");
    if (!info.rows.some(c => c.name === "weight")) {
      await db.execute("ALTER TABLE prizes ADD COLUMN weight REAL DEFAULT 1");
    }
  } catch (e) { console.error("weight migration failed:", e); }
  return db;
}
