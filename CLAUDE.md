# Scribble 2

Private real-time drawing/guessing game (2–20 players). React 19 + Vite frontend, Cloudflare Worker + SQLite-backed Durable Object backend. `README.md` has the full feature list, project map and multiplayer design; `deployment-verification.md` and `design-qa.md` record the last verified release.

- Live site: https://scribble-2-somnath.pages.dev
- GitHub: https://github.com/somnath-07/Scribble_2.0 (branch `main`)

## Architecture in one paragraph

Each room is one `RoomDurableObject` named by its 8-char room ID (`worker/room.ts`). It is the single source of truth: presence, phases (`WAITING → WORD_SELECTION → DRAWING → TURN_RESULTS → GAME_RESULTS`), timers (DO alarms + `phaseEndsAt`), scoring, words and canvas command history. Clients only *request* actions over a hibernating WebSocket at `/api/rooms/:roomId/ws`; the server validates everything (`worker/validation.ts`). Pure logic (scoring, hints, rounds, host migration) lives in `worker/game-engine.ts`. Client↔server message types are in `shared/protocol.ts`; shared data model in `shared/game-types.ts`; limits in `shared/constants.ts`. The client socket is `src/hooks/useRoomSocket.ts`.

## How the live site is deployed (important)

Deployment is **direct upload with Wrangler from this machine**. The Pages project is NOT connected to GitHub, so pushing to GitHub does not update the site. Editing files changes nothing live until you deploy.

There are two Cloudflare pieces, both on account `fc8e670b219ed1861e1352ed85435572` ("Outstanding Gravity"):

1. **Worker `scribble-2`** (`wrangler.jsonc`): hosts the `RoomDurableObject` class, i.e. all game logic. Deployed with `npm run deploy`.
2. **Pages project `scribble-2-somnath`** (`pages/wrangler.jsonc`): serves the built frontend from `dist/client` plus a `_worker.js` that re-exports `worker/handler.ts` (HTTP/WebSocket routing). Its `ROOMS` binding points at the Durable Object inside the `scribble-2` Worker. Deployed with `npm run deploy:pages` (which runs `scripts/prepare-pages.mjs`).

Which to deploy:

- Only `src/`, `public/`, `index.html` changed → `npm run deploy:pages` is enough.
- Anything in `worker/` or `shared/` changed → `npm run deploy` **first**, then `npm run deploy:pages`.
- When unsure, run both, Worker first.

The Wrangler login (somworld47@gmail.com) can see two Cloudflare accounts. In an interactive terminal Wrangler asks which one; in non-interactive runs (e.g. from Claude) set the account explicitly:

```bash
CLOUDFLARE_ACCOUNT_ID=fc8e670b219ed1861e1352ed85435572 npm run deploy:pages
```

`npm run deploy` already has `account_id` in `wrangler.jsonc`.

Never edit the deployed `v1` Durable Object migration; append a new migration if DO classes are added or renamed.

## Release checklist

```bash
npm test                 # 30 Vitest unit tests (game engine + room handler)
npm run build            # tsc --noEmit + Vite production build
npm run deploy           # only if worker/ or shared/ changed
npm run deploy:pages
git add -A && git commit && git push   # keep GitHub in sync with what is live
```

Verify after deploying: `curl https://scribble-2-somnath.pages.dev/api/health` returns `{"ok":true,"service":"scribble-2"}`, and the `/assets/index-*.js` filename in the live `index.html` matches `dist/client/index.html`.

## Local development

- Node ≥ 22.13 is required (installed at `~/.local/node`, on PATH via `~/.zshrc`).
- `npm run dev` runs the frontend, Worker and local Durable Objects together at http://127.0.0.1:5173. Local room data lives in `.wrangler/` (delete it to reset).
- `npm run test:e2e` runs Playwright multi-browser tests. The Chromium project uses installed Google Chrome; Firefox and WebKit come from `npx playwright install firefox webkit`.
- Use a separate browser profile or incognito window for a second player; tabs in one profile share an identity.

## Conventions

- Keep the server authoritative: never trust client-sent scores, answers or turn order.
- Bound and validate every new incoming message field in `worker/validation.ts` and add it to `shared/protocol.ts`.
- Plain CSS in `src/styles/global.css`; no CSS framework.
- No accounts, secrets or paid services; stay within Cloudflare's free tier.
