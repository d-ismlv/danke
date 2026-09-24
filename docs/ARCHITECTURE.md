# Architecture

One Next.js (App Router) process serves the UI and the single API route. SQLite
— via [Drizzle](https://orm.drizzle.team) — is the only datastore and lives on a
mounted volume, so the container stays disposable. Scheduling is
[ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs).

```
Next.js (React)
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
| `cards` | `id`, `topic_id`, `title`, `points` (JSON list), `position` — `(topic_id, title)` unique |
| `review_state` | 1:1 with a card: `due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, … |
| `review_logs` | append-only `card_id` / `rating` / `reviewed_at`, which is what Progress reads |

A card is a question and the points that answer it — at least one, with no
upper limit, and each point able to hold a bulleted or numbered list of its own,
one level deep. `points` is stored as the list it is authored and rendered as
(`{ ordered, items }`), not as markdown to be re-parsed on every render. Cards
written before points could nest hold a plain array of strings, and `toList`
reads both.

`(topic_id, title)` is the card's import identity: re-importing a corrected file
updates the points of a question the topic already has and leaves its schedule
alone.

## Content format

The only formatting a card carries is `**bold**`, `*italic*`, `` `code` ``,
``**`bold code`**`` and `[links](https://…)`. That is five rules, so
`src/lib/markup.ts` is a small tokenizer rather than a markdown pipeline — and
it returns a tree, never a string, so card content cannot become markup whatever
an import contains. A link only enters that tree with an `http(s)` address;
anything else stays the text it was written as, and the importer reports it.
Links open in a new tab, because the study session's queue lives in the page.

`src/lib/parse.ts` is the only definition of the import format. It is pure, so
the live preview in the browser and the server action that writes the rows agree
exactly on what a paste means; a single problem stops the whole import, because
a half-imported topic is worse than a failed one.

## Studying

There is one session behaviour, and the only thing that varies between studying
a topic, a deck or everything is which cards go into the queue:

1. cards that are **due**, oldest debt first;
2. cards you have **never seen**, shuffled;
3. the rest of the selection, nearest to due first.

A card you have never seen is never also due, even though FSRS stamps it due
from the moment it is imported. Every "due" figure in the app means studied
cards whose turn has come round; the unseen ones are counted beside them.

Within each band, a multi-topic session deals cards out one topic at a time, so
studying a whole deck moves across it instead of spending its first twenty cards
inside one topic. There is no practice mode to choose and no mode switch: a
session runs out of due cards and carries on, and every answer is graded.

Grading goes through a **route handler** (`/api/review`) rather than a Server
Action, so answering a card doesn't trigger an RSC refresh of the study route
and discard the queue the client is holding.

**Learned** means one thing everywhere it appears — a deck row, a topic row, the
Progress page: the share of those cards FSRS has graduated out of learning
(`state = 2`). One definition behind every percentage in the app.

## Learning status

The coloured mark beside a deck on Library, the dot beside a topic inside a
deck, and the mark beside a deck on Progress → By deck are the same
measurement drawn three times: how the cards in that scope are actually going.
Never an identity colour, and never keyed to a deck's id, name or position.

`src/lib/status.ts` holds the one classifier, and its thresholds are named
constants so they can be argued with in one place rather than in three
components. In precedence order:

| | |
|---|---|
| `new` — grey | nothing in scope has ever been answered |
| `struggling` — amber | the recent answers keep coming back Again, or a third of what has been seen is relearning or repeatedly lapsed |
| `strong` — green | predominantly mature, and not struggling |
| `learning` — blue | everything else that has been started |

Being **due** is deliberately not in that list: a due card is a healthy card
whose turn has come round, and a deck does not turn amber for being scheduled
today. Every mark is paired with a text description, because colour is never
the only carrier of a fact.

`src/lib/queries.ts` produces the inputs once per topic and rolls them up to
decks and to the library, so the three surfaces cannot disagree.

## Screens

Library (`/`) · Deck · Topic · Study · Import · Progress · Login. Six, plus the
lock screen, and each one has a single job.

The shell is a fixed rail on the left that becomes a five-column bottom bar
under 900px, a top bar carrying only the wordmark, and a content column capped
at `82rem` so a 4K display gets a readable measure rather than a stretched one.

The rail holds Library, Progress and Import, then Theme and Lock. A deck, a
topic and a card are not there: they are states you reach by going down through
the library, and each carries its own way back up. Every screen builds its
header from the same `.page-heading` block, so the title and the action button
sit at identical coordinates and nothing slides when you change page.

## Styling

`src/app/globals.css` is the whole visual system: tokens, then the classes the
screens are built from, ported from the `danke-v3` mockup rather than
approximated. Tailwind is imported for its reset (Preflight) and nothing else —
no utility classes appear in the components, so there is one place a colour,
a radius or a rhythm is decided.

Theme is `system` / `light` / `dark`, cycled by one button in the rail. The
choice lives in a cookie so the server can stamp `data-theme` on `<html>` while
it renders, which is what removes the flash; `system` is the absence of the
attribute and falls through to `prefers-color-scheme`.

## Access

One password, and a signed session cookie per sign-in (`src/lib/session.ts`):
different on every device, refused after thirty days, and all revoked at once
by changing `AUTH_SESSION_TOKEN`.

`src/proxy.ts` turns anonymous requests away before they reach a page, and
nothing relies on it alone. Every server action, the review route and every
read in `src/lib/queries.ts` checks the session again, because the root layout
renders a page's content whether or not the visitor is signed in.

Wrong passwords are throttled per client address, in memory: five free, then a
wait that doubles from ten seconds to fifteen minutes. The address is the
**last** `X-Forwarded-For` entry — the one the reverse proxy in front of danke
appended — since every entry before it was written by the caller.

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
