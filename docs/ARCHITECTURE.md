# Architecture

One Next.js (App Router) process serves the UI, the API route and a topic's
download. SQLite — via [Drizzle](https://orm.drizzle.team) — is the only
datastore and lives on a mounted volume, so the container stays disposable.
Scheduling is [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs).

```
Next.js (React)
 ├─ Server components            → reads, through src/lib/queries.ts
 ├─ Server actions               → writes, through src/lib/actions.ts
 ├─ /api/review (route handler)  → grading
 ├─ /topics/:id/download         → a topic as Markdown, in the import format
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

Each grade key shows how long that grade would put the card away. The intervals
are ts-fsrs's own predictions, worked out on the server — for every card when
the queue is built, and again in the review response for a card that comes back
after an Again — so the scheduler never has to reach the browser.

**Learned** means one thing everywhere it appears — a deck row, a topic row, the
Progress page: the share of those cards FSRS has graduated out of learning
(`state = 2`). One definition behind every percentage in the app.

## Learning status

How the cards in a deck or topic are actually going — one measurement, read
by a deck row on Library, a topic row inside a deck, and a deck row on
Progress → By deck. Never an identity colour, and never keyed to a deck's id,
name or position.

`src/lib/status.ts` holds the one classifier, and its thresholds are named
constants so they can be argued with in one place rather than in three
components. In precedence order:

| | |
|---|---|
| `new` | nothing in scope has ever been answered |
| `struggling` | the recent answers keep coming back Again, or a third of what has been seen is relearning or repeatedly lapsed |
| `strong` | predominantly mature, and not struggling |
| `learning` | everything else that has been started |

Only `struggling` is said out loud on a row: "Needs attention", in amber, in
place of the row's usual line. The other three stay quiet, so the one row that
wants you stands out instead of being one coloured mark among many. Progress →
By deck adds which of the two rules it tripped.

Being **due** is deliberately not in that list: a due card is a healthy card
whose turn has come round, and a deck does not turn amber for being scheduled
today.

`src/lib/queries.ts` produces the inputs once per topic and rolls them up to
decks and to the library, so the three surfaces cannot disagree.

## Screens

Library (`/`) · Deck · Topic · Study · Import · Progress · Login. Six, plus the
lock screen, and each one has a single job.

The shell is a white top bar — the name, Library, Progress and Import, then the
streak, Theme and Lock — over a 12-column content column capped at 1240px so a
4K display gets a readable measure rather than a stretched one. Under 900px the
three places move to a tab bar at the bottom and the streak, Theme and Lock
stay at the top right; under 760px the panels fold into plain sections of one
flat page, because a phone has no room for boxes inside boxes. A study session hides the bar and puts
its own in its place: the way back, the session's progress, and the count.

A deck, a topic and a card are not in the bar: they are states you reach by
going down through the library, and each carries its own way back up. Every
screen opens with the same heading panel (`.head`), so the title sits at
identical coordinates and nothing slides when you change page. Its right side
holds what is waiting — "9 due · 7 new" — and Study, and nothing else: Start
review, Study deck and Study topic land on the same spot on every page, full
width on a phone.

Library, a deck and a topic are screens you study from, so each is that heading
and one list, and nothing more. The figures, the memory bar and the activity
calendar are Progress's. What changes a deck or topic (Add cards, Export,
Reset, Delete) waits in grey under the list it changes, with Delete alone at
the far end, never beside Study.

## Styling

`src/app/globals.css` is the whole visual system, "Ledger": tokens, then the
classes the screens are built from. One type scale, one spacing scale, one
12px bar for every distribution in the app, warm graded colour with no reds,
and text that only ever sits on a solid panel over a dotted page. Colour is
spent where the eye should go: violet only on Study and on what is due, amber
only on a row that needs attention; navigation, captions and tools are ink and
grey. Tailwind's
reset (Preflight) is imported on its own and nothing else is — no utility
classes exist to collide with, so there is one place a colour, a radius or a
rhythm is decided. Geist and Geist Mono come through `next/font`, downloaded at
build time and served by the app itself.

Theme is `system` / `light` / `dark`, cycled by one button in the top bar. The
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
