# Scribble 2 visual QA

## Comparison targets

- Source visual truth:
  - `test-results/reference/home-reference.webp` — current Skribbl.io-style home reference, 800 × 457 px.
  - `test-results/reference/lobby-reference.webp` — current Skribbl.io-style private-room reference, 800 × 477 px.
  - `test-results/reference/gameplay-nowgg.jpg` — current Skribbl.io-style gameplay reference, 1920 × 1079 px.
- Rendered implementation:
  - `test-results/screenshots/home.png` — 1280 × 720 px.
  - `test-results/screenshots/lobby-two-players.png` — 1280 × 720 px.
  - `test-results/screenshots/drawing-turn.png` — 1280 × 720 px.
  - `test-results/screenshots/word-selection.png` — 1280 × 720 px.
  - `test-results/screenshots/results.png` — 1280 × 720 px.
  - `test-results/screenshots/mobile.png` — 390 × 844 px.
- CSS viewport: 1280 × 720 desktop and 390 × 844 mobile.
- Density normalization: all implementation captures use device scale factor 1. Reference and implementation frames have different source dimensions, so the comparison uses normalized full-frame proportions rather than pixel-coordinate equivalence.
- State: empty home form; two-player host lobby; first drawing turn with one stroke; non-drawer word-selection overlay; game results; mid-game mobile spectator.

## Full-view comparison evidence

- Home: the implementation now follows the reference hierarchy with a multicolor outlined wordmark, blue doodle field, compact dark-blue player card, white name control, central avatar customizer, flat high-contrast action buttons, and square-edged game UI.
- Lobby: the implementation mirrors the reference composition with the player rail on the left, charcoal settings surface in the main region, compact white controls, blue/green invite and start actions, and a white room header.
- Gameplay: the implementation matches the reference's dominant three-column proportions: alternating player rows, large white canvas, narrow chat rail, white round/word bar, and a compact color-and-tool tray directly below the canvas.
- Responsive: the mobile capture keeps the canvas, overlay, player list, and chat usable without horizontal overflow. The centered phase card stays fully inside the 390 px viewport.

## Focused-region comparison evidence

The desktop captures are readable at their native 1280 × 720 size, so separate crops were not required. Focused visual checks were made on the home logo/form, lobby settings/player rows, gameplay top bar/canvas/tool tray, word-selection overlay, and results podium.

## Required fidelity surfaces

- Fonts and typography: rounded system fallbacks, heavier display weights, outlined logo lettering, compact uppercase labels, and denser small UI copy reproduce the reference hierarchy without an external font dependency.
- Spacing and layout rhythm: panel gaps, square radii, header height, left/center/right proportions, toolbar density, and lobby control rhythm align with the reference. Persistent game controls remain visible at 1280 × 720.
- Colors and visual tokens: saturated cobalt background, darker blue doodles, white play surfaces, charcoal lobby controls, blue secondary actions, green primary actions, yellow drawer emphasis, and gray alternating rows map directly to the reference language.
- Image quality and asset fidelity: `public/doodle-bg.png` is a high-resolution project-local raster texture generated for this UI. Existing configurable player avatars remain sharp at every tested size and preserve the app's avatar-customization behavior.
- Copy and content: product-specific Scribble 2 room, player, chat, and game copy is retained. The public quick-match and language-selector content shown in the reference is intentionally omitted because this product is private-room-only and functionality was not expanded.

## Findings

- No actionable P0, P1, or P2 visual differences remain for the requested Skribbl-inspired direction.
- Accepted product constraint: the wordmark reads “Scribble 2” and the home flow contains one private-room action, preserving the product's identity and existing behavior instead of cloning Skribbl.io's public matchmaking.

## Comparison history

### Iteration 1

- Earlier finding: P2 viewport fit — inherited lobby bottom padding caused the gameplay screen to show a page scrollbar at 1280 × 720, risking partial toolbar obstruction.
- Fix made: the gameplay page now uses a dedicated compact bottom padding while retaining the lobby's fixed invite-bar clearance.
- Post-fix evidence: `test-results/screenshots/drawing-turn.png` shows the canvas, complete tool tray, player rail, chat rail, and top bar inside the 1280 × 720 frame with no page scrollbar.

## Verification

- Primary interactions tested: create a room, join from an isolated second browser context, synchronize players, start a game, choose a word, draw, submit guesses, score, finish the game, play again, enforce room capacity, expire a server-owned timer, transfer host after reconnect grace, and render a mobile spectator state.
- Automated browser suite: 4 passed.
- Unit suite: 13 passed.
- Production build: passed.
- Browser console: no warnings or errors in the home/lobby host tab or the multiplayer guest/game tab.

## Follow-up polish

- P3: a future branding pass could replace the system-font wordmark with an original commissioned logo asset while keeping the same dimensions and color rhythm.

final result: passed
