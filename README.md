# danke

A self-hosted, markdown-first flashcard app with modern spaced repetition.
An alternative to Anki that is pleasant to use on both desktop and mobile,
and runs as a single container you fully control.

> **Status:** MVP working locally. All core flows — decks/categories, markdown
> cards, FSRS review loop, and progress — are built and verified. Containerizing
> is the next step (see [Milestones](#milestones)).

## Getting started

```bash
npm install
npm run db:migrate   # creates ./data/danke.db
npm run dev          # http://localhost:3000
```

The SQLite database and any media live under `./data` (gitignored). That's the
entire persistent state — back it up or delete it to start fresh.

### Password

The whole app sits behind a single-password gate. `npm install` does not create
one — credentials live in `.env.local` (gitignored):

```
AUTH_PASSWORD=<the password you type on the login page>
AUTH_SESSION_TOKEN=<opaque random string stored in the session cookie>
```

Generate both with:

```bash
node -e "const c=require('crypto'),a='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';let p='';for(const b of c.randomBytes(16))p+=a[b%a.length];require('fs').writeFileSync('.env.local',`AUTH_PASSWORD=${p}\nAUTH_SESSION_TOKEN=${c.randomBytes(24).toString('hex')}\n`);console.log('Password:',p)"
```

A `middleware.ts` redirects every unauthenticated request to `/login`; a correct
password sets an httpOnly cookie. "Lock" in the header logs out.

### Importing cards

Each deck has an **Import** button: paste one card per line with front and back
separated by a delimiter (Tab — matching Anki's text export — or comma/semicolon/
pipe). A live preview shows how the text parses before you commit. Markdown is
preserved inside each field.

---

## Why

Anki's scheduling engine is excellent, but its desktop app (especially on macOS)
is dated and clunky. `danke` keeps the part that works — a strong spaced-repetition
scheduler — and rebuilds everything around it: markdown authoring, a clean
responsive UI, and a zero-fuss local deployment.

## Goals (MVP)

- **Local-first.** One container, one SQLite file, one media folder. No accounts,
  no cloud, no sync.
- **Markdown everything.** Card content is markdown (GFM: tables, checklists,
  code, math via KaTeX).
- **Modern SRS.** Scheduling powered by [FSRS](https://github.com/open-spaced-repetition/ts-fsrs),
  the same algorithm modern Anki defaults to.
- **Decks & categories.** Nestable decks to organize cards.
- **Classic flip cards.** Front → reveal back → self-rate (Again / Hard / Good / Easy).
- **Progress.** Per-deck due counts, session summaries, a review heatmap/streak.
- **Responsive.** Works well on a phone and a laptop.
- **Single-password gate.** A lightweight login protects the whole app.
- **Bulk import.** Paste delimited text to create many cards at once.

## Explicit non-goals (for MVP)

These are deliberately deferred to keep the first version shippable:

- Multi-device sync or multi-user accounts (auth is a single shared password)
- `.apkg` (Anki binary) import/export — text/delimited import is supported
- Auto-graded card types (multiple choice, type-answer, cloze)
- Shared/public decks, collaboration
- Audio/TTS

None of these are ruled out later; the data model is designed not to block them.

---

## Card model

MVP ships **one** card type: the **classic self-graded flip card**.

- **Front** (markdown) — the prompt.
- **Back** (markdown) — the answer, revealed on demand.
- Grading is **self-assessment**: after revealing the back, the user rates recall
  as **Again / Hard / Good / Easy**. That rating feeds directly into FSRS.

This is how Anki fundamentally works, and it maps 1:1 onto the FSRS rating scale,
which is why it's the right MVP primitive. Auto-graded types (MCQ, cloze,
type-the-answer) are a later layer on top of the same content + scheduling split.

---

## Architecture

Single Next.js process serves both the UI and the API. SQLite is the only
datastore. Everything persists to a mounted volume so the container stays
disposable.

```
┌─────────────────────────────────────────────┐
│  Container                                    │
│                                               │
│   Next.js (App Router, TypeScript)            │
│   ├─ UI (React, Tailwind, shadcn/ui)          │
│   └─ API routes / server actions              │
│         │                                     │
│         ├─ Drizzle ORM ── SQLite  ──┐         │
│         └─ ts-fsrs (scheduler)      │         │
│                                     │         │
└─────────────────────────────────────┼─────────┘
                                      │
                    mounted volume ───┴──►  ./data/danke.db
                                            ./data/media/*
```

### Stack

| Concern        | Choice                        | Why |
|----------------|-------------------------------|-----|
| Framework      | Next.js (App Router) + TS     | One process for UI + API; trivial to containerize |
| DB             | SQLite                        | Single file, zero infra, ideal for local |
| ORM            | Drizzle                       | Lightweight, no query-engine binary, small container |
| Scheduler      | `ts-fsrs`                     | Modern SRS as a library, not a rewrite |
| Styling        | Tailwind + shadcn/ui          | Fast path to a clean responsive UI |
| Markdown       | `react-markdown` + `remark-gfm` + `rehype-katex` | GFM + math |

### Why these picks

- **Drizzle over Prisma** — no separate query-engine binary, lighter image, and
  the schema-as-code fits a small project well.
- **Scheduling state kept separate from card content** (`review_state` table, not
  columns on `cards`) — keeps authoring and scheduling concerns decoupled, so
  resetting progress or importing content later doesn't entangle the two.

---

## Data model

Four tables. `review_state` holds exactly the fields `ts-fsrs` produces, so
persistence is just "save what the library returns."

```
decks
  id           text pk
  name         text
  parent_id    text null → decks.id      # nesting = categories
  created_at   integer (epoch ms)

cards
  id           text pk
  deck_id      text → decks.id
  front        text   (markdown)
  back         text   (markdown)
  created_at   integer
  updated_at   integer

review_state                              # 1:1 with cards, FSRS-owned
  card_id      text pk → cards.id
  due          integer (epoch ms)
  stability    real
  difficulty   real
  elapsed_days integer
  scheduled_days integer
  reps         integer
  lapses       integer
  state        integer   # 0 New, 1 Learning, 2 Review, 3 Relearning
  last_review  integer null

review_logs                               # append-only, powers progress
  id           text pk
  card_id      text → cards.id
  rating       integer   # 1 Again, 2 Hard, 3 Good, 4 Easy
  state        integer   # card state at review time
  due          integer
  reviewed_at  integer
```

---

## Core review loop

This is the product. It gets built first; everything else is scaffolding around it.

1. User opens a deck → query cards where `due <= now`, ordered by due.
2. Render the **front** (markdown). Space / tap reveals the **back**.
3. User rates **Again / Hard / Good / Easy**.
4. Pass the card's current `review_state` + rating into `ts-fsrs` → get the next
   state → persist to `review_state`, append to `review_logs`.
5. Advance to the next due card.
6. When the queue empties: session summary — *"N reviewed · next due in X."*

FSRS also exposes the projected interval for each rating, so the four buttons can
show *"Good → 4d"* style hints.

---

## Screens

- **Home / deck list** — nested decks with due-count badges. Entry point.
- **Review session** — the core loop; minimal, keyboard- and touch-friendly.
- **Card editor** — split pane: markdown source ↔ live preview.
- **Card browser** — list/search cards within a deck; edit or delete.
- **Progress** — review heatmap, streak, per-deck stats (from `review_logs`).

---

## Markdown & media

- Rendering: `react-markdown` + `remark-gfm` (tables, task lists, strikethrough)
  + `rehype-katex` (math). Code blocks get syntax highlighting.
- Images (MVP): drag/paste → saved to the mounted `./data/media` folder →
  inserted as `![alt](/media/<uuid>.png)`. (Base64-in-markdown is an acceptable
  even-simpler fallback for the very first cut.)

---

## Docker

A multi-stage [`Dockerfile`](Dockerfile) builds the app and runs `next start`.
On boot the container applies DB migrations ([`scripts/migrate.mjs`](scripts/migrate.mjs))
then serves on port **32323**. It runs as the unprivileged `node` user (uid 1000)
and keeps all state in `DANKE_DATA_DIR` (`/app/data`), which is a mounted volume —
so the container itself stays disposable.

Quick local run:

```bash
docker build -t danke .
docker run -p 32323:32323 \
  -e AUTH_PASSWORD=some-password \
  -e AUTH_SESSION_TOKEN=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))") \
  -v $(pwd)/data:/app/data danke
```

### Deploying (Komodo, behind nginx-proxy-manager)

[`docker-compose.yml`](docker-compose.yml) is a self-contained Komodo stack that
follows the host conventions: `restart: unless-stopped`, the external `npm_proxy`
network, data under `/home/ismlv/docker/data/danke`, and a `komodo.stack` label.
Port 32323 is published so NPM can proxy a domain to `10.1.1.3:32323`.

1. Put the repo on the server (git clone / Komodo repo) so the build context is
   available.
2. Create `.env` beside the compose file (see [`.env.example`](.env.example)):
   ```
   DANKE_AUTH_PASSWORD=<your password>
   DANKE_AUTH_SESSION_TOKEN=<random hex, see below>
   TZ=Europe/Stockholm
   ```
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
3. Deploy the stack (Komodo, or `docker compose up -d --build`). Migrations run
   automatically on start.
4. In NPM, add a proxy host for your domain → `10.1.1.3:32323` (HTTP). TLS is
   terminated at NPM; the app sets a `Secure` cookie which works over that HTTPS
   leg. (Only if you must hit the container over plain HTTP directly, set
   `AUTH_INSECURE_COOKIE=true`.)

> NPM's default proxy headers (preserving `Host`, forwarding `X-Forwarded-*`)
> satisfy Next.js's server-action origin check, so login works as-is. If actions
> ever 403 behind a differently-configured proxy, add your domain to
> `serverActions.allowedOrigins` in `next.config.ts`.

The `danke` service can also be pasted into your existing `core` stack instead of
running standalone — in that case reference a pre-built `image: danke:latest`
(built via `docker build -t danke:latest .` on the server) rather than `build: .`,
since `core`'s build context won't contain danke's source.

---

## Milestones

1. ✅ **Scaffold** — Next.js + TS + Tailwind + Drizzle + SQLite + ts-fsrs.
2. ✅ **Decks & cards CRUD** — nested decks/categories, markdown editor with live
   split preview, card browser.
3. ✅ **Review loop** — FSRS wiring, four-button flip session with interval
   previews, in-session re-queue of (re)learning cards, session summary.
4. ✅ **Progress** — due badges, review heatmap, streak, per-deck stats.
5. ✅ **Auth & import** — single-password gate; bulk delimited-text import.
6. ✅ **Container** — Dockerfile + Komodo compose + migrate-on-boot.

Later: `.apkg` import, auto-graded card types, cloze, multi-device sync, export,
image upload handling.

---

## Naming

*danke* — "thanks" in German; a small nod to the spaced-repetition tradition
(SuperMemo, Anki) and to remembering what you're grateful to have learned.
