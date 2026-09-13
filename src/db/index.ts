import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

type DB = BetterSQLite3Database<typeof schema>;

/**
 * Lazily-opened SQLite connection, memoized for the life of the process.
 * Opening is deferred until the first query so that merely importing this
 * module (e.g. during Next's build-time page-data collection) doesn't touch the
 * file — which otherwise makes parallel build workers collide on the lock.
 *
 * The memo used to be skipped in production, on the reasoning that only dev
 * hot-reload needs it. But `db` below is a Proxy that calls `init()` on *every*
 * property read, so skipping the memo meant a fresh `new Database()` — plus a
 * mkdir and three pragmas — for every `db.select`, none of them ever closed.
 * Ten requests to the decks page left eighteen open descriptors on danke.db;
 * sixty concurrent requests, thirty-seven. Production is the one environment
 * where it mattered most.
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
  globalForDb.danke = instance;
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
