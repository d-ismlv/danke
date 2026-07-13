# Image support and UI refresh

This checklist is the durable handoff point for work on the `dev` branch.
Update it whenever a task is completed or the implementation pauses.

## Current checkpoint

- Branch: `dev`
- Completed: local media storage, validation, migration, and delivery routes
- Completed: image picker, drag/drop, paste, automatic Markdown insertion
- Completed: context-aware image presentation, zoom, and review interaction
- Completed: visual foundation and the first screen-level UI/UX refresh
- Completed: media cleanup and the first UX safeguard pass
- Completed: responsive visual revision, non-destructive practice, and progress reset
- In progress: optional follow-up enhancements

## Follow-up revision

- [x] Replace the display serif with a smaller sans-serif hierarchy
- [x] Replace the brain badge with a friendlier study-card mark
- [x] Remove viewport-filling whitespace from the review stage
- [x] Expand the shell responsively without horizontal overflow
- [x] Allow practice for completed decks without changing scheduling
- [x] Allow practice for one selected card
- [x] Add confirmed per-card progress reset
- [x] Add confirmed deck-tree progress reset
- Last verified: lint, TypeScript, production build, isolated migration, and an
  authenticated upload/download byte-for-byte round trip

## 1. Local image storage

- [x] Create the media metadata table and migration
- [x] Store uploaded files under `DANKE_DATA_DIR/media`
- [x] Add a route for uploading images
- [x] Add a route for serving stored images
- [x] Accept JPEG, PNG, WebP, and GIF images
- [x] Enforce an upload-size limit
- [x] Generate collision-safe filenames
- [x] Prevent path traversal and invalid media identifiers
- [x] Add orphan cleanup when removing images from cards

## 2. Image authoring

- [x] Add an image picker to the card editor
- [x] Support drag and drop
- [x] Support clipboard paste
- [x] Show upload progress and errors
- [x] Insert uploaded image Markdown at the cursor
- [x] Add explicit replace and remove actions
- [x] Support images on both the front and back

## 3. Image presentation

- [x] Constrain images without changing their aspect ratio
- [x] Tune image sizing for editor, card browser, and review contexts
- [x] Add click-to-zoom behavior
- [x] Test portrait, landscape, animated, and transparent images
- [x] Verify light and dark mode presentation

## 4. Visual foundation

- [x] Refine the color palette and typography
- [x] Define consistent spacing, radii, and control heights
- [x] Reduce repetitive bordered containers
- [x] Standardize primary, secondary, quiet, and destructive actions
- [x] Improve hover, focus, pending, and disabled states

## 5. Navigation and deck screens

- [x] Add active navigation states
- [x] Improve deck-tree hierarchy and due-count scanning
- [x] Simplify deck actions
- [x] Add image thumbnails to card rows
- [x] Add card search and state filters
- [x] Add card and deck deletion confirmation
- [x] Improve empty states

## 6. Card editor UX

- [x] Create a more spacious desktop workspace
- [x] Add a compact Markdown toolbar
- [x] Strengthen front/back distinction
- [x] Add editor/preview tabs on mobile
- [x] Add save progress and success feedback
- [x] Warn about unsaved changes
- [x] Improve the Add and new workflow

## 7. Review UX

- [x] Replace the review card's outer button with a non-interactive container
- [x] Create a focused review-stage layout
- [x] Improve front/answer separation
- [x] Improve grading controls on narrow screens
- [x] Keep keyboard shortcuts discoverable
- [x] Allow image zoom without revealing the answer
- [x] Handle grading failures
- [x] Refine progress and completion states

## 8. Verification and documentation

- [x] Test existing text-only cards
- [x] Test image upload, rendering, replacement, and deletion
- [x] Test database migration and Docker volume persistence
- [x] Test desktop and mobile layouts
- [x] Check keyboard navigation and visible focus states
- [x] Run lint and the production build
- [x] Update README and architecture documentation
- [x] Document media backup behavior

Final verification: lint, TypeScript, production build, responsive light/dark
browser rendering, and byte-for-byte JPEG/PNG/WebP/GIF upload round trips all
pass on 2026-07-13.
