# Architecture

One Next.js (App Router) process serves the UI and the single API route. SQLite
— via [Drizzle](https://orm.drizzle.team) — is the only datastore and lives on a
mounted volume, so the container stays disposable. Scheduling is
[ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs).

```
Next.js (React + Tailwind v4)
 ├─ Server components            → reads, through src/lib/queries.ts
 ├─ Server actions               → writes, through src/lib/actions.ts
 ├─ /api/review (route handler)  → grading
 ├─ Drizzle ORM                  → SQLite (./data/danke.db)
 └─ ts-fsrs                      → scheduler
```

## Data model

The hierarchy is two levels deep and the tables say so: a deck holds topics, a
topic holds cards, and there is nowhere else a card can be. Content
(`cards`) and scheduling (`review_state`) stay separate so authoring and spaced
repetition don't entangle.

| Table | Holds |
|---|---|
| `decks` | `id`, `name` (unique), `created_at` |
| `topics` | `id`, `deck_id`, `name` — unique within its deck |
| `cards` | `id`, `topic_id`, `title`, `points` (JSON array), `position` — `(topic_id, title)` unique |
| `review_state` | 1:1 with a card: `due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, … |
| `review_logs` | append-only `card_id` / `rating` / `reviewed_at`, which is what Progress reads |

A card is a question and the two to six points that answer it. `points` is
stored as the array it is authored and rendered as, not as markdown to be
re-parsed on every render.

`(topic_id, title)` is the card's import identity: re-importing a corrected file
updates the points of a question the topic already has and leaves its schedule
alone.

## Content format

The only formatting a card carries is `**bold**`, `*italic*`, `` `code` `` and
``**`bold code`**``. That is four rules, so `src/lib/markup.ts` is a 40-line
tokenizer rather than a markdown pipeline — and it returns a tree, never a
string, so card content cannot become markup whatever an import contains.

`src/lib/parse.ts` is the only definition of the import format. It is pure, so
the live preview in the browser and the server action that writes the rows agree
exactly on what a paste means; a single problem stops the whole import, because
a half-imported topic is worse than a failed one.

## Studying

There is one session behaviour, and the only thing that varies between studying
a topic, a deck or everything is which cards go into the queue:

1. cards that are **due**, oldest debt first;
2. cards you have **never seen**;
3. the rest of the selection, nearest to due first.

Within each band, a multi-topic session deals cards out one topic at a time, so
studying a whole deck moves across it instead of spending its first twenty cards
inside one topic. There is no practice mode to choose and no mode switch: a
session runs out of due cards and carries on, and every answer is graded.

Grading goes through a **route handler** (`/api/review`) rather than a Server
Action, so answering a card doesn't trigger an RSC refresh of the study route
and discard the queue the client is holding.

**Learned** means one thing everywhere it appears — on a deck tile, a topic row,
the Progress page: the share of those cards FSRS has graduated out of learning
(`state = 2`). One definition behind every percentage and every progress bar.

## Screens

Library (`/`) · Deck · Topic · Study · Import · Progress · Login. Six, plus the
lock screen, and each one has a single job.

## Deployment

The image is published to `ghcr.io/d-ismlv/danke` by a GitHub Actions workflow on
every push to `main`. On boot the container (`docker-entrypoint.sh`) provisions a
session secret if one wasn't supplied, applies pending migrations
(`scripts/migrate.mjs`), then serves on port `32323` as an unprivileged user.

### Upgrading from v1

The content model changed shape — a card used to be two markdown blobs in a tree
of nestable decks — and nothing maps across. `scripts/migrate.mjs` detects a
pre-v2 database, copies it to `danke.db.pre-v2-<date>.bak` beside itself, drops
the old tables and rebuilds. Import your content again afterwards.
