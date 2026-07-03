// Applies pending Drizzle migrations, then exits. Runs at container startup
// (before `next start`). Uses drizzle-orm's migrator — a runtime dependency —
// so neither drizzle-kit nor TypeScript is needed in the production image.
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";

const dataDir = process.env.DANKE_DATA_DIR
  ? path.resolve(process.env.DANKE_DATA_DIR)
  : path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "danke.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

migrate(drizzle(sqlite), {
  migrationsFolder: path.join(process.cwd(), "drizzle"),
});

sqlite.close();
console.log(`[danke] migrations applied → ${dbPath}`);
