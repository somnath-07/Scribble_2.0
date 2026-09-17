# Deployment verification — 2026-09-18

## Public deployment

- Primary game: https://scribble-2-somnath.pages.dev
- Pages deployment: https://49303e16.scribble-2-somnath.pages.dev
- Existing multiplayer Worker: `scribble-2`
- Worker version: `8e35230f-8927-4166-8864-f18b9c04570d`
- Cloudflare account: `fc8e670b219ed1861e1352ed85435572`
- Free plan retained. No paid plan, domain, storage subscription or upgrade purchased.
- Pages connects directly to the existing SQLite Durable Object binding. It does not proxy through a browser-visible workers.dev hostname or depend on a local tunnel/server.
- Both Worker and Pages were rebuilt and published with the lobby, viewport, reaction and podium refinements, server-synchronized countdown, and top-to-bottom hair/headwear → eyes → mouth arrow order. The primary Pages link remains recommended for networks that block workers.dev.

## Verified results

- `npm run build`: passed during both latest Worker and Pages deployments on September 18.
- `npm test`: 30/30 passed, including 17 room-state tests, at 02:06 IST on September 18.
- Local browser regression: 16/16 passed (`test-results/refinement-regression/.last-run.json`).
- Final hosted browser regression: **17/17 passed in 5.2 minutes**, exit code 0, on September 18 against the primary public URL. `test-results/production-avatar-order/.last-run.json` records `status: passed` with no failed tests. The earlier September 17 production-refinements run was interrupted before its final result was saved and is not counted as a complete pass.
- All four focused local avatar/compatibility scenarios reported passing on September 18, but the local dev-server teardown stalled and that runner was stopped. The complete hosted run does not start a local dev server and is the final acceptance check.
- Tested engines: installed desktop Google Chrome and Playwright mobile WebKit (iPhone 13 viewport/touch emulation).
- Earlier full production runs also passed: 11 tests, then 12 tests before the final extra-controls/clock regression was added.
- Firefox: blocked before page load by a local Windows browser-launch problem (`spawn UNKNOWN`; direct startup previously reported an incorrect side-by-side configuration). Firefox is not verified.
- `git diff --check`: passed; Git emitted only line-ending normalization warnings.
- Ignore checks confirmed dependencies, `.env`, `.env.local`, `.wrangler`, nested Pages `.wrangler`, `dist`, test results, browser reports and credentials are excluded.

## Browser coverage

1. Three reference-inspired pixel-avatar combinations at mobile width, loaded layers and no horizontal overflow.
2. Two-player compatibility flow: creation, invite, avatar synchronization, mouse/touch drawing, guesses, scores and game completion.
3. Custom words, hidden mode, fill bucket, eraser, undo, sound toggles and in-game kick protection. The host clock is deliberately two minutes incorrect to exercise server-based countdown display. Server unit tests reject kicks in selection, drawing, turn reveal and final results.
4. Mobile lobby avatar customization visible to another player.
5. Complete multiplayer game, chat, undo/clear, final results, replay and mid-game spectator joining.
6. Server-enforced capacity.
7. Server-owned drawing timeout.
8. Host transfer after reconnect grace.
9. Earned points preserved across a real 65-second network outage and page reload.
10. Focus changes and explicit same-profile tab takeover without a reconnect loop.
11. Empty room restores canvas and paused turn.
12. Missing/expired room UI gives an actionable error.
13. Mobile WebKit runs the two-player compatibility flow separately.
14. Logo leave confirmation/cancel, immediate host handoff, a readable Waiting badge and only one avatar editor entry point.
15. Like/dislike synchronization and reconnect persistence, no self-voting, last-player victory and gameplay viewport bounds at six desktop/mobile sizes.
16. Four-player game completion with exactly three podium places and rank four below, inspected at desktop and mobile widths.
17. Avatar arrow row order on home and lobby, independent rendered-layer changes, reverse selection and wraparound.

The main gameplay and compatibility tests check browser errors. These results are not a guarantee for every browser version, physical device, ISP or future outage.

## Retention evidence

- Unit tests exercise the actual room handler with simulated Durable Object storage and clocks: score restoration after runtime reinstantiation, nine-minute retention, exact ten-minute expiration, delayed alarms, stale sessions, credential isolation, dead sockets, host/drawer grace and duplicate-score prevention.
- A connected lone host remains present after 20 simulated minutes. Confirmed exits transfer host immediately; disconnects get 60-second grace before a last-player victory. Paused empty-room time does not consume that grace when players return.
- A real hosted timed check successfully kept an empty room available for six minutes, then rejoined and verified both stored scores and resumed game state.
- The final ten-minute hosted-expiry process output was unavailable after the session resumed. Do not count that particular timed assertion as confirmed. The exact ten-minute boundary is confirmed by the unit tests.
- Reproduce the full timed probe with `node scripts/verify-hosted.mjs https://scribble-2-somnath.pages.dev`.

## Player identity and limits

Scores survive reconnects within the same room using the same browser profile and site origin. Clearing browser data, switching devices/origins, or using incognito creates a new identity. Starting a new game resets scores intentionally. Empty rooms are removed after ten minutes; abrupt network loss can take up to two minutes to be detected. Free-tier Cloudflare quotas still apply.

## Source-control handoff

- Local directory: `D:/Scribble 2.0`
- Existing remote: https://github.com/somnath-07/Scribble_2.0.git
- Branch: `main`
- Source baseline before this update: `8b60d5cb2b12828e675f80842b7359e7bd99b011`
- The prior approval-service credit blocker is resolved: `git fetch origin` succeeded and local HEAD matched origin/main before the new commit. Source synchronization follows hosted verification; use `git log -1 --format=%H` and `git status -sb` for the final revision and branch state. No force push is used, and no new GitHub repository was created.

Visual evidence and asset provenance: `design-qa.md`, `public/avatars/README.md` and `public/avatars/manifest.json`.
