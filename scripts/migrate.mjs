// Applies pending Drizzle migrations, then exits. Runs at container startup
// (before the server). Uses drizzle-orm's migrator — a runtime dependency — so
// neither drizzle-kit nor TypeScript is needed in the production image.
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

/**
 * danke's content model changed shape: a card used to be two markdown blobs in
 * a tree of nestable decks, and is now a question plus its points inside a
 * topic inside a deck. Nothing maps across, so this release starts the database
 * over rather than pretending to migrate.
 *
 * Detection is the presence of a `cards` table that has no `topic_id` column.
 * The old file is copied aside first — a reset that cannot be undone is not one
 * anybody should discover by running an upgrade.
 */
function resetLegacySchema() {
  const hasCards = sqlite
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'cards'`)
    .get();
  if (!hasCards) return;
  const columns = sqlite.prepare(`PRAGMA table_info(cards)`).all();
  if (columns.some((c) => c.name === "topic_id")) return;

  const backup = `${dbPath}.pre-v2-${new Date().toISOString().slice(0, 10)}.bak`;
  if (!fs.existsSync(backup)) {
    // Fold the write-ahead log back into the main file first: in WAL mode the
    // most recent writes live in `danke.db-wal`, and a copy of `danke.db`
    // alone is a backup missing whatever was done last. `backup()` would do
    // this too, but it resolves asynchronously — the drops below would run
    // against a file nobody had finished copying yet.
    sqlite.pragma("wal_checkpoint(TRUNCATE)");
    fs.copyFileSync(dbPath, backup);
  }
  console.log(`[danke] pre-v2 database found — backed up to ${backup}`);

  sqlite.pragma("foreign_keys = OFF");
  for (const table of [
    "review_logs",
    "review_state",
    "cards",
    "media_assets",
    "decks",
    "__drizzle_migrations",
  ]) {
    sqlite.exec(`DROP TABLE IF EXISTS \`${table}\``);
  }
  sqlite.pragma("foreign_keys = ON");
  console.log("[danke] old tables dropped; rebuilding for the new content model");
}

resetLegacySchema();

migrate(drizzle(sqlite), {
  migrationsFolder: path.join(process.cwd(), "drizzle"),
});

sqlite.close();
console.log(`[danke] migrations applied → ${dbPath}`);
