# Architecture

A single Next.js (App Router) process serves both the UI and the API. SQLite —
via [Drizzle](https://orm.drizzle.team) — is the only datastore, and it lives on
a mounted volume so the container stays disposable. Scheduling is powered by
[ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs).

```
Next.js (React + Tailwind)
 ├─ Server components + actions   → decks / cards CRUD
 ├─ /api/review (route handler)   → grading
 ├─ Drizzle ORM                   → SQLite (./data/danke.db)
 └─ ts-fsrs                       → scheduler
```

## Data model

Four tables. `review_state` mirrors the ts-fsrs `Card` fields; `Date`s are
stored as epoch-ms integers.

| Table | Holds |
|---|---|
| `decks` | `id`, `name`, `parent_id` (nesting), `created_at` |
| `cards` | `id`, `deck_id`, `front` (md), `back` (md), timestamps |
| `review_state` | 1:1 with a card — `due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, … |
| `review_logs` | append-only grading history (powers stats) |

Content (`cards`) and scheduling (`review_state`) are kept separate so authoring
and spaced-repetition concerns don't entangle.

## Review loop

1. Query cards due now for the deck (and its sub-decks).
2. Show the front → reveal the back.
3. Rate **Again / Hard / Good / Easy** → ts-fsrs computes the next state → persist it and append a log.
4. (Re)learning cards re-queue within the session; graduated cards schedule out.

Grading goes through a **route handler** (`/api/review`), not a Server Action —
so it doesn't trigger an RSC refresh of the review page and wipe the
client-managed session queue.

## Screens

Home (decks + due badges) · Deck (card browser) · Review · Card editor · Import ·
Stats.

## Markdown & media

Rendering uses `react-markdown` + `remark-gfm` + `rehype-katex`. Images can be
embedded straight in Markdown (base64, or a path served from the data volume).

## Deployment

The image is published to `ghcr.io/d-ismlv/danke` by a GitHub Actions workflow on
every push to `main`. On boot the container (`docker-entrypoint.sh`) provisions a
session secret if one wasn't supplied, applies pending migrations
(`scripts/migrate.mjs`), then serves on port `32323` as an unprivileged user.
