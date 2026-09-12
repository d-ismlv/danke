# Architecture

A single Next.js (App Router) process serves both the UI and the API. SQLite —
via [Drizzle](https://orm.drizzle.team) — is the only datastore, and it lives on
a mounted volume so the container stays disposable. Scheduling is powered by
[ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs).

```
Next.js (React + Tailwind)
 ├─ Server components + actions   → decks / cards CRUD
 ├─ /api/review (route handler)   → grading
 ├─ /api/media (route handlers)   → local image upload / delivery
 ├─ Drizzle ORM                   → SQLite (./data/danke.db)
 ├─ Local media                   → ./data/media
 └─ ts-fsrs                       → scheduler
```

## Data model

Five tables. `review_state` mirrors the ts-fsrs `Card` fields; `Date`s are
stored as epoch-ms integers.

| Table | Holds |
|---|---|
| `decks` | `id`, `name`, `parent_id` (nesting), `created_at` |
| `cards` | `id`, `deck_id`, `front` (md), `back` (md), timestamps, and the nullable ladder columns `concept_id`, `rung`, `source_key` |
| `media_assets` | uploaded image metadata; binary files live under `data/media` |
| `review_state` | 1:1 with a card — `due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, … |
| `review_logs` | append-only grading history (powers stats) |

Content (`cards`) and scheduling (`review_state`) are kept separate so authoring
and spaced-repetition concerns don't entangle.

### Ladders

A *ladder* is one concept drilled through seven rungs — name, mechanism,
prerequisites, boundaries, breaks, detection, advice. Each rung is an ordinary
card that FSRS schedules on its own, tagged with `concept_id` (the group),
`rung` (1–7), and `source_key` (`concept#rung`, unique). The columns are
nullable throughout, so danke stays a general flashcard app and existing cards
are untouched.

The importer (`src/lib/import.ts`, `parseLadders`) reads one markdown file per
concept — front-matter names the concept and its deck path, and each
`## <rung> :: <question>` heading is a card. Import **upserts on `source_key`**,
so re-importing edited content updates `front`/`back` and leaves `review_state`
alone; losing an FSRS history to a typo fix would defeat the point.

Nothing about a ladder's *progress* is stored: the edge (first rung missed) is
derived from `review_logs` in `src/lib/ladder.ts`. **Drill mode**
(`/drill/[concept]`) walks a ladder in order and stops at the first Again;
**rung-band review** (`/decks/[id]/review?rungs=1-2`) filters normal review to
one altitude across a deck; the **edge map** (`/edge`) is concept × highest rung
passed. All three grade through the same `/api/review` route handler.

## Review loop

1. Query cards due now for the deck (and its sub-decks).
2. Show the front → reveal the back.
3. Rate **Again / Hard / Good / Easy** → ts-fsrs computes the next state → persist it and append a log.
4. (Re)learning cards re-queue within the session; graduated cards schedule out.

Practice mode uses the same card presentation but never calls the grading API,
so revisiting a completed deck or an individual card cannot change its FSRS
schedule. Reset is a separate confirmed action: it restores fresh FSRS state and
removes the affected review logs for either one card or the selected deck tree.

Grading goes through a **route handler** (`/api/review`), not a Server Action —
so it doesn't trigger an RSC refresh of the review page and wipe the
client-managed session queue.

## Screens

Home (decks + due badges) · Deck (card browser) · Review · Card editor · Import ·
Ladder import · Drill · Edge map · Stats.

## Markdown & media

Rendering uses `react-markdown` + `remark-gfm` + `rehype-katex`. The editor can
choose, drag, or paste JPEG, PNG, WebP, and GIF images. Uploads are stored under
`DANKE_DATA_DIR/media`, referenced from card Markdown through `/api/media/:id`,
and served through the app. Unreferenced files are removed after card edits or
deletion; abandoned uploads receive a 24-hour grace period.

## Deployment

The image is published to `ghcr.io/d-ismlv/danke` by a GitHub Actions workflow on
every push to `main`. On boot the container (`docker-entrypoint.sh`) provisions a
session secret if one wasn't supplied, applies pending migrations
(`scripts/migrate.mjs`), then serves on port `32323` as an unprivileged user.
