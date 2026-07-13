# Image support and UI refresh

This checklist is the durable handoff point for work on the `dev` branch.
Update it whenever a task is completed or the implementation pauses.

## Current checkpoint

- Branch: `dev`
- Completed: local media storage, validation, migration, and delivery routes
- Completed: image picker, drag/drop, paste, automatic Markdown insertion
- In progress: image presentation and zoom behavior
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
- [ ] Add orphan cleanup when removing images from cards

## 2. Image authoring

- [x] Add an image picker to the card editor
- [x] Support drag and drop
- [x] Support clipboard paste
- [x] Show upload progress and errors
- [x] Insert uploaded image Markdown at the cursor
- [ ] Add explicit replace and remove actions (preview works through Markdown)
- [x] Support images on both the front and back

## 3. Image presentation

- [ ] Constrain images without changing their aspect ratio
- [ ] Tune image sizing for editor, card browser, and review contexts
- [ ] Add click-to-zoom behavior
- [ ] Test portrait, landscape, animated, and transparent images
- [ ] Verify light and dark mode presentation

## 4. Visual foundation

- [ ] Refine the color palette and typography
- [ ] Define consistent spacing, radii, and control heights
- [ ] Reduce repetitive bordered containers
- [ ] Standardize primary, secondary, quiet, and destructive actions
- [ ] Improve hover, focus, pending, and disabled states

## 5. Navigation and deck screens

- [ ] Add active navigation states
- [ ] Improve deck-tree hierarchy and due-count scanning
- [ ] Simplify deck actions
- [ ] Add image thumbnails to card rows
- [ ] Add card search and state filters
- [ ] Add card and deck deletion confirmation
- [ ] Improve empty states

## 6. Card editor UX

- [ ] Create a more spacious desktop workspace
- [ ] Add a compact Markdown toolbar
- [ ] Strengthen front/back distinction
- [ ] Add editor/preview tabs on mobile
- [ ] Add save progress and success feedback
- [ ] Warn about unsaved changes
- [ ] Improve the Add and new workflow

## 7. Review UX

- [ ] Replace the review card's outer button with a non-interactive container
- [ ] Create a focused review-stage layout
- [ ] Improve front/answer separation
- [ ] Improve grading controls on narrow screens
- [ ] Keep keyboard shortcuts discoverable
- [ ] Allow image zoom without revealing the answer
- [ ] Handle grading failures
- [ ] Refine progress and completion states

## 8. Verification and documentation

- [ ] Test existing text-only cards
- [ ] Test image upload, rendering, replacement, and deletion
- [ ] Test database migration and Docker volume persistence
- [ ] Test desktop and mobile layouts
- [ ] Check keyboard navigation and visible focus states
- [ ] Run lint and the production build
- [ ] Update README and architecture documentation
- [ ] Document media backup behavior
