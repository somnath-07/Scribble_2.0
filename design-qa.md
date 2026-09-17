# Scribble 2 visual QA — original layout pass

This first section records the earlier whole-game layout pass. The current avatar-specific review and production evidence are appended below and supersede the old avatar/test counts.

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

## Current avatar review — 2026-09-17

### Findings

No actionable P0/P1/P2 visual issues remain in the requested avatar editor. The three combinations use original pixel artwork rather than copying the supplied game assets. Exact facial silhouettes differ intentionally; the reference's bust composition, bold black edges, vivid colors and three paired arrow rows are preserved.

### Comparison targets and normalization

Source visual truth (user-provided crops):

- `C:/Users/somwo/AppData/Local/Temp/codex-clipboard-571432c3-d924-443b-8297-29893b8ad2db.png`: red pirate, 197 × 122 pixels.
- `C:/Users/somwo/AppData/Local/Temp/codex-clipboard-d6effd4d-a66a-4799-a3cc-985591f0baca.png`: cyan visor, 297 × 190 pixels.
- `C:/Users/somwo/AppData/Local/Temp/codex-clipboard-b6b277f0-0a79-4ceb-86c9-fea6e0b5855c.png`: glasses, 177 × 112 pixels.

Browser-rendered production evidence from `https://scribble-2-somnath.pages.dev`, captured by installed Chrome at 390 × 844 CSS pixels, device scale 1, screenshots explicitly at CSS scale:

- `test-results/avatar-review/avatar-visual-reference-in-b9f73--crisp-and-usable-on-mobile-chromium/red-pirate.png`
- Same directory: `cyan-visor.png`, `round-glasses.png` (each 300 × 172 pixels).
- Same directory: `mobile-home.png` (390 × 844 pixels).
- Desktop and multiplayer states: `test-results/screenshots/home.png`, `lobby-avatar-customizer.png`, `drawing-turn.png`, `results.png` from the production browser suite.

All three reference/implementation pairs and the complete mobile page were opened together in one comparison input. The supplied crops have no viewport metadata; the focused regions were compared using equal conceptual boundaries and normalized proportions, not claimed pixel-coordinate equality. Combinations were explicitly selected through the UI: red + eyepatch + open mouth + headband; cyan + visor + moustache + bandana; skin tone + round glasses + grin.

### Full-view evidence

The mobile home retains the outlined multicolor logo, blue doodle background and centered dark-blue setup card. Name input, avatar arrows, selection description, colors, randomize and room creation remain visible at 390 × 844. There is no horizontal overflow. The lobby editor uses the same component and synchronizes changes to another player.

### Focused comparison and required fidelity surfaces

- **Fonts/typography:** the supplied avatar crops contain no text. Existing compact sans-serif labels remain outside the artwork. The selection description fits at mobile width without overlapping other controls.
- **Spacing/layout:** the central bust is bracketed by three evenly spaced arrow rows, reproducing the source hierarchy. The editor is deliberately larger than the tiny source crops for practical touch targets. Full bust visibility holds for all three variants.
- **Colors/tokens:** saturated blue, black outlines, white arrows and yellow active-arrow feedback follow the references. Bright red and cyan body choices are available. The existing doodle texture remains instead of copying the source background.
- **Image quality:** original generated 128 × 128 transparent raster layers render with pixelated scaling. All images loaded successfully; alpha masks tint only the body. No visible halos, missing layers, stretched screenshots or handcrafted avatar SVG substitutes. Cyan bandana and grin details differ as original-art choices.
- **Copy/content:** concise labels describe the eyes, mouth and accessory; body swatches, Randomize and Create private room are functional. No prompt text leaks into the UI.
- **Accessibility/interaction:** arrows and swatches have distinct accessible names; selected swatches expose pressed state; changes are announced. Tests exercise both arrow directions and synchronized lobby avatar updates. Existing keyboard focus styling remains.

### Comparison history and verification

The former smooth avatar art was replaced with modular pixel layers and the requested three-row layout. Current post-change comparison found no additional P0/P1/P2 discrepancy, so no further visual iteration was required.

The reference-combination Chrome test passed against production. Desktop Chrome and mobile WebKit tests cover complete two-player drawing/scoring and page errors. See `deployment-verification.md` for final hosted results. WebKit mobile emulation is not a physical iPhone test. Firefox execution is separately limited by this Windows machine's browser-runtime startup error. Asset provenance is in `public/avatars/README.md` and `manifest.json`.

P3 follow-up: additional original accessory choices could expand the combinations; not required for this request.

final result: passed

## Lobby, gameplay and results refinements — 2026-09-17

Scoped updates address the user's lobby/gameplay/result screenshots without replacing the established art direction:

- Top-left logo is a leave button with confirmation. Waiting has a white-on-navy badge. Avatar pictures are no longer edit buttons; Customize is the sole editor entry point.
- A viewport-height gameplay shell constrains the 4:3 drawing surface, keeps the palette/reactions/chat input on screen, and uses a horizontal player strip above chat on narrow screens.
- Like/dislike controls live beneath the canvas tools and in the drawing reveal. Selected state is exposed through `aria-pressed`; drawers cannot vote on themselves.
- Results use a centered gold winner, silver runner-up and shorter bronze third-place step. Only ranks four onward appear below. One/two-player results do not create empty podium placeholders.

Inspected browser-rendered screenshots in `test-results/room-refinements/`: `lobby-desktop.png`, `game-1497x866.png`, `game-390x844.png`, `podium-desktop.png`, and `podium-mobile.png`. The first review found third place visually too similar in height to second; bronze-step padding was reduced before final verification. The three dedicated browser tests passed, including measured viewport bounds at 1497×866, 1280×720, 1024×768, 390×844, 320×568 and 844×390. Final regression/hosted status is recorded in `deployment-verification.md`.

Behavioral assertions cover confirmation cancel/accept, host handoff, server kick rejection, reconnect grace, last-player winner, vote synchronization and persisted selection, spectator exclusion from standings, and score-prioritized/forced-winner ranking. Unit tests use distinct join timestamps so frozen-clock ties cannot randomly choose a different successor.

## Avatar arrow order — 2026-09-18

The top row now controls hair/headwear, the middle row eyes and the bottom row mouths. Both arrow directions and the selection caption use that order on the home page and in the shared lobby editor. Existing saved avatar fields and artwork remain compatible. A dedicated browser regression checks each row's accessible name, that only its matching rendered layer changes, that Previous reverses Next, and that a full four-choice cycle wraps correctly on both screens.

The mobile editor screenshot `test-results/avatar-order/avatar-visual-avatar-arrow-ace4a-g-part-on-home-and-in-lobby-chromium/avatar-arrow-order.png` was visually inspected: all three arrow rows, full avatar, ordered caption, body colors and save/cancel controls are visible. The complete final hosted suite passed 17/17 tests, including this mapping regression and the earlier lobby/gameplay/podium changes. See `deployment-verification.md` for deployment identifiers and browser limitations.
