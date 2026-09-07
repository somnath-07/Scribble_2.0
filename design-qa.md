# Scribble 2 visual QA

## Comparison targets

- Source visual truth:
  - `test-results/reference/home-reference.webp` — current Skribbl.io-style home reference, 800 × 457 px.
  - `test-results/reference/lobby-reference.webp` — current Skribbl.io-style private-room reference, 800 × 477 px.
  - `test-results/reference/gameplay-nowgg.jpg` — current Skribbl.io-style gameplay reference, 1920 × 1079 px.
  - `test-results/reference/user-mobile-lobby.png` — user-provided compact mobile reference, 196 × 432 px.
- Rendered implementation:
  - `test-results/screenshots/home.png` — 1280 × 720 px.
  - `test-results/screenshots/lobby-two-players.png` — 1280 × 720 px.
  - `test-results/screenshots/drawing-turn.png` — 1280 × 720 px.
  - `test-results/screenshots/word-selection.png` — 1280 × 720 px.
  - `test-results/screenshots/results.png` — 1280 × 720 px.
  - `test-results/screenshots/mobile.png` — 390 × 844 px.
  - `test-results/screenshots/lobby-mobile.png` — 390 px wide mobile lobby with two players.
  - `test-results/screenshots/lobby-avatar-customizer.png` — 390 px wide mobile lobby with the avatar editor open.
- CSS viewport: 1280 × 720 desktop and 390 × 844 mobile.
- Density normalization: all implementation captures use device scale factor 1. Reference and implementation frames have different source dimensions, so the comparison uses normalized full-frame proportions rather than pixel-coordinate equivalence.
- State: empty home form; two-player host lobby; mobile lobby; mobile avatar editor; first drawing turn with one stroke; non-drawer word-selection overlay; game results; mid-game mobile spectator.

## Full-view comparison evidence

- Home: the implementation now follows the reference hierarchy with a multicolor outlined wordmark, blue doodle field, compact dark-blue player card, white name control, central avatar customizer, flat high-contrast action buttons, and square-edged game UI.
- Lobby: the implementation mirrors the reference composition with the player rail on the left, charcoal settings surface in the main region, compact white controls, blue/green invite and start actions, and a white room header.
- User mobile reference: the implementation now carries over the narrow reference's compact blue header, centered waiting status, dark primary stage, dense alternating white/gray player rows with avatars at the right edge, and blue doodle field. Lobby-only settings remain in the primary stage so all existing host controls stay available.
- Avatar customization: the self avatar and the visible Customize control open a focused bottom-aligned editor on mobile. Body color, eyes, mouth, accessory, and randomize controls use practical tap targets, and Apply/Cancel remain visible without horizontal overflow.
- Gameplay: the implementation matches the reference's dominant three-column proportions: alternating player rows, large white canvas, narrow chat rail, white round/word bar, and a compact color-and-tool tray directly below the canvas.
- Responsive: the mobile captures keep settings, the avatar editor, player rows, and invite actions usable without horizontal overflow. The game phase card also stays fully inside the 390 px viewport.

## Focused-region comparison evidence

The desktop captures are readable at their native 1280 × 720 size, so separate crops were not required. Focused visual checks were made on the home logo/form, lobby settings/player rows, gameplay top bar/canvas/tool tray, word-selection overlay, and results podium.

## Required fidelity surfaces

- Fonts and typography: rounded system fallbacks, heavier display weights, outlined logo lettering, compact uppercase labels, and denser small UI copy reproduce the reference hierarchy without an external font dependency.
- Spacing and layout rhythm: panel gaps, square radii, header height, left/center/right proportions, toolbar density, and lobby control rhythm align with the reference. Persistent game controls remain visible at 1280 × 720.
- Colors and visual tokens: saturated cobalt background, darker blue doodles, white play surfaces, charcoal lobby controls, blue secondary actions, green primary actions, yellow drawer emphasis, and gray alternating rows map directly to the reference language.
- Image quality and asset fidelity: `public/doodle-bg.png` is a high-resolution project-local raster texture generated for this UI. Existing configurable player avatars remain sharp at every tested size and preserve the app's avatar-customization behavior.
- Copy and content: product-specific Scribble 2 room, player, chat, and game copy is retained. The public quick-match and language-selector content shown in the reference is intentionally omitted because this product is private-room-only and functionality was not expanded.
- States and interactions: avatar editing opens from the lobby header or the current player's avatar, supports Escape/backdrop/Cancel dismissal, persists locally, and synchronizes through the existing multiplayer player-update message.
- Accessibility: the avatar editor is exposed as a labeled modal dialog; controls have labels, keyboard focus indicators, and mobile tap targets; reduced-motion handling remains intact.

## Findings

- No actionable P0, P1, or P2 visual differences remain for the requested Skribbl-inspired direction.
- Accepted product constraint: the wordmark reads “Scribble 2” and the home flow contains one private-room action, preserving the product's identity and existing behavior instead of cloning Skribbl.io's public matchmaking.

## Comparison history

### Iteration 1

- Earlier finding: P2 viewport fit — inherited lobby bottom padding caused the gameplay screen to show a page scrollbar at 1280 × 720, risking partial toolbar obstruction.
- Fix made: the gameplay page now uses a dedicated compact bottom padding while retaining the lobby's fixed invite-bar clearance.
- Post-fix evidence: `test-results/screenshots/drawing-turn.png` shows the canvas, complete tool tray, player rail, chat rail, and top bar inside the 1280 × 720 frame with no page scrollbar.

### Iteration 2

- Earlier finding: P1 lobby avatar customization was only available before room entry, so the requested lobby action was missing and the player's current avatar was not an edit affordance.
- Fix made: added a clear Customize control, made the current player's avatar editable, reused the existing configurable avatar system, persisted the selected avatar, and sent it through the existing server-validated player update path.
- Post-fix evidence: `test-results/screenshots/lobby-avatar-customizer.png` shows the complete mobile editor, while the two-context browser assertion confirms the selected body color appears for both players.

### Iteration 3

- Earlier finding: P2 mobile hierarchy put the player list before the dark setup stage, which diverged from the user's top-stage-then-player-list reference.
- Fix made: reordered the mobile grid, introduced the compact centered Waiting status, reduced header and player-row height, and retained all settings and invite actions.
- Post-fix evidence: `test-results/screenshots/lobby-mobile.png` shows the header, dark setup stage, ranked players, and bottom actions in the intended vertical order without clipping or horizontal scroll.

## Verification

- Primary interactions tested: create a room, customize and persist an avatar in the mobile lobby, synchronize that avatar to an isolated second browser context, synchronize players, start a game, choose a word, draw, submit guesses, score, finish the game, play again, enforce room capacity, expire a server-owned timer, transfer host after reconnect grace, and render mobile states.
- Automated browser suite: 5 passed.
- Unit suite: 13 passed.
- Production build: passed.
- Browser console: no warnings or errors in the home/lobby host tab or the multiplayer guest/game tab.

## Follow-up polish

- P3: a future branding pass could replace the system-font wordmark with an original commissioned logo asset while keeping the same dimensions and color rhythm.

final result: passed
