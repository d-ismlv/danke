import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

type DB = BetterSQLite3Database<typeof schema>;

/**
 * Lazily-opened SQLite connection, memoized across dev hot reloads. Opening is
 * deferred until the first query so that merely importing this module (e.g.
 * during Next's build-time page-data collection) doesn't touch the file — which
 * otherwise makes parallel build workers collide on the database lock.
 */
const globalForDb = globalThis as unknown as {
  danke?: { sqlite: Database.Database; db: DB };
};

function init() {
  if (globalForDb.danke) return globalForDb.danke;

  const dataDir = process.env.DANKE_DATA_DIR
    ? path.resolve(process.env.DANKE_DATA_DIR)
    : path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const sqlite = new Database(path.join(dataDir, "danke.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const instance = { sqlite, db: drizzle(sqlite, { schema }) };
  if (process.env.NODE_ENV !== "production") globalForDb.danke = instance;
  return instance;
}

export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = init().db as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
