# Scribble 2

Scribble 2 is a private, real-time drawing and guessing game for 2–20 friends. A host creates a room, shares one URL, and everyone connected to that URL plays in the same authoritative Cloudflare Durable Object room.

There are no accounts, paid APIs, external databases, or application secrets. Player identity and avatar preferences are stored only on that player's device; room and game state live in the room's Durable Object.

## What is included

- Original player avatar customizer and persistent device identity
- Secure eight-character private room links
- Real-time lobby presence, host-only settings, kicking, and local muting
- Server-controlled `WAITING → WORD_SELECTION → DRAWING → TURN_RESULTS → GAME_RESULTS` state machine
- Private word choices that are sent only to the current drawer
- Mouse, touch, and stylus drawing on a fixed 800×600 logical canvas
- Batched brush/eraser strokes, deterministic fill, synchronized undo, and clear
- Reconnectable canvas command history (never streamed screenshots)
- Public guessing, private close-guess feedback, answer-safe solved-player chat, and rate limits
- Speed-based guesser points, drawer points, hints, early completion, multiple rounds, and a final podium
- Reconnect grace, drawer-disconnect handling, host migration, spectators joining mid-game, and one-hour empty-room cleanup
- Responsive desktop, tablet, and mobile layouts, keyboard focus, labels, and drawer hotkeys
- Optional Web Audio sound cues with a mute control
- 690+ original, locally stored English prompts plus custom-word support

## Technology

- React 19, TypeScript, Vite, and plain CSS
- HTML Canvas and Pointer Events
- Cloudflare Worker, SQLite-backed Durable Objects, native WebSockets, WebSocket Hibernation API, and Durable Object alarms
- Vitest for pure game-engine tests
- Playwright for isolated, multi-browser-context gameplay tests

This project follows the current Cloudflare Vite plugin layout. `npm run dev` runs both the React app and the Worker/Durable Object runtime together, so local behavior closely matches deployment.

## Project map

```text
src/
  components/          Avatar UI
  features/
    canvas/            Canvas renderer, flood fill, drawing tools
    chat/              Guess/chat panel
    game/              Live game layout and word selection
    home/              Player setup and room creation
    lobby/             Settings, invite link, lobby
    players/           Shared leaderboard/player list
    results/           Final standings and replay actions
  hooks/               Reconnecting WebSocket client
  lib/                 Device profile and sound helpers
  styles/              Responsive visual system
worker/
  index.ts             HTTP/API routing and one-room-one-object routing
  room.ts              Authoritative Durable Object room
  game-engine.ts       Pure scoring, hints, words, rounds, host migration
  validation.ts        Incoming message and payload validation
  words.ts             Original local English prompt pack
shared/
  constants.ts         Shared limits and defaults
  game-types.ts        Shared data model
  protocol.ts          Typed client/server WebSocket messages
tests/
  unit/                Vitest game-engine coverage
  e2e/                 Playwright multiplayer flows
wrangler.jsonc         Worker, static assets, and Durable Object binding
```

## Install

### Prerequisites

Install Node.js 22.13 or newer. Node 24 LTS works well. npm is included with Node.js.

From the project folder:

```bash
npm install
npx playwright install chromium
```

The second command downloads the browser used by the end-to-end tests. It is not needed just to play the game.

## Run locally

```bash
npm run dev
```

Open the Local URL printed in the terminal, normally `http://127.0.0.1:5173`.

The local Cloudflare runtime saves temporary Durable Object data under `.wrangler/`. That folder is ignored by Git. To reset every local room, stop the development server and delete `.wrangler/`.

### Test with two players manually

1. Open the home page and enter a name.
2. Choose **Create private room**.
3. Copy the invite link at the bottom of the lobby.
4. Open a private/incognito window or a different browser. A normal second tab reuses the same local player identity, so an isolated window is better.
5. Open the invite link, enter a second name, and join.
6. Confirm both players appear immediately in both windows.
7. In the host window, set **Rounds** to 1 and choose **Start game**.
8. Use the word buttons in whichever window becomes the drawer.
9. Draw in that window and guess from the other one.

## Commands

```bash
npm run dev          # React + Worker + local Durable Objects
npm run build        # Strict TypeScript check and production bundle
npm run test         # Unit tests
npm run test:e2e     # Real multi-context browser tests
npm run preview      # Preview the production build locally
npm run deploy       # Build and deploy to Cloudflare
npm run cf-typegen   # Regenerate Cloudflare binding types if config changes
```

## How multiplayer works

The room ID is the Durable Object name:

```text
/room/H7K9QD2M
       │
       └── env.ROOMS.getByName("H7K9QD2M")
                         │
                         └── exactly one RoomDurableObject instance
```

Every client connects to `/api/rooms/:roomId/ws`. The Worker validates the ID and forwards that connection to the named Durable Object. The object validates every action and owns player presence, settings, phases, timestamps, word secrets, scores, hints, drawing history, and progression.

The client never submits a score, the next drawer, or an answer result. It can only request an action. The room accepts or rejects that request based on its current server state.

Hibernating WebSockets keep clients connected while allowing an idle room object to sleep. Important room state is stored in the object's small SQLite-backed key/value snapshot. Canvas traffic is kept as validated logical commands; points are batched by the client, merged by stroke ID on the server, and checkpointed without storing image frames.

Timers use `phaseEndsAt` timestamps and Durable Object alarms. Browser intervals only update the visible countdown; they cannot advance a turn or award points.

## Security and privacy

- Word choices and the selected word are serialized only into the current drawer's personalized room state.
- Guesser room state contains only a mask or “Secret word” in hidden mode.
- Incoming messages have a 32 KB cap and discriminated runtime validation.
- Names, chats, settings, colors, sizes, coordinates, and point counts are bounded.
- Chat has a short rolling rate limit and text is rendered by React, not as HTML.
- Drawing events are accepted only from the current drawer during `DRAWING`.
- Correct guesses and all scoring are calculated on the server.
- Security headers are provided in `public/_headers`.
- There are no application API keys or passwords to configure.

## Create a free Cloudflare account

1. Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. Create an account and verify your email.
3. The Workers Free plan is sufficient for small private games. New free-plan Durable Objects must use SQLite storage; this project already does.

Cloudflare publishes current Worker and Durable Object allowances on its [pricing page](https://developers.cloudflare.com/workers/platform/pricing/). Check that page if you plan to host a public, high-traffic version.

## Install and sign in to Wrangler

Wrangler is already a project dependency, so a global installation is not required.

```bash
npx wrangler login
```

Your browser opens a Cloudflare authorization page. Choose the account that should own the game and approve access. The login is stored by Wrangler on your computer, not in this repository.

To confirm the login:

```bash
npx wrangler whoami
```

## Durable Object binding

You do not need to create a database or namespace manually. `wrangler.jsonc` contains both required pieces:

```jsonc
"durable_objects": {
  "bindings": [
    { "name": "ROOMS", "class_name": "RoomDurableObject" }
  ]
},
"migrations": [
  { "tag": "v1", "new_sqlite_classes": ["RoomDurableObject"] }
]
```

On the first deployment, Wrangler creates the SQLite-backed Durable Object namespace, binds it as `ROOMS`, uploads the Worker, and publishes the static app. Keep the `v1` migration in source control. If a future change adds or renames Durable Object classes, append a new migration instead of editing an already deployed one.

## Deploy and get the live URL

After signing in:

```bash
npm run test
npm run build
npm run deploy
```

Wrangler prints a URL similar to:

```text
https://scribble-2.<your-workers-subdomain>.workers.dev
```

Open that URL, create a room, and share the complete room URL shown in the lobby. Friends do not need a Cloudflare account.

To use a custom domain later, open **Workers & Pages → scribble-2 → Settings → Domains & Routes** in the Cloudflare dashboard and add a domain you already own. A custom domain is optional and may itself cost money; the `workers.dev` address is enough to play.

## Automated browser verification

`npm run test:e2e` starts or reuses the local app and launches isolated Chromium contexts. The suite verifies:

- two real browser identities joining one room
- live player presence and refresh/reconnect
- synchronized host settings
- private word selection
- remote canvas strokes, undo, and clear
- wrong and correct guesses
- score/turn advancement, final results, and play again
- server-enforced room capacity
- server-authoritative timer expiration
- mobile viewport rendering
- absence of critical browser console errors in the main flow

Successful runs write visual checkpoints to `test-results/screenshots/`. Test output is intentionally ignored by Git.

## Troubleshooting

### The page says it is reconnecting

Confirm the development server is still running and that the room URL has not been edited. Local rooms disappear if `.wrangler/` is removed. Deployed empty rooms expire after about one hour.

### A second tab replaces the first player

Tabs in the same browser profile share the same local player ID. Use an incognito window, another browser profile, or another device to act as a different player. Reusing the identity is intentional so refresh/reconnect can restore a session.

### Browser tests say the executable is missing

```bash
npx playwright install chromium
```

Then run `npm run test:e2e` again.

### Wrangler reports that you are not authenticated

```bash
npx wrangler login
npx wrangler whoami
```

Then retry `npm run deploy`.

### Deployment reports a Durable Object migration problem

Make sure `wrangler.jsonc` still includes the `ROOMS` binding and the `v1` `new_sqlite_classes` migration. Do not replace `new_sqlite_classes` with the legacy `new_classes`; the latter is not available for a new free-plan namespace.

### Direct room links show 404

Keep `assets.not_found_handling` set to `single-page-application` in `wrangler.jsonc`. This sends `/room/:roomId` through the Vite SPA entry point while `/api/*` continues through the Worker.

### Drawing feels delayed

Use the closest available network connection and avoid browser extensions that throttle background pages. Local brush rendering is immediate; validated remote batches are sent about every 24 ms.

## Current intentional limits

- English is the only bundled language pack.
- Joining during a live game is spectator-only until the next game, which prevents partial-turn scoring ambiguity.
- Mute is local to one device, and kicked-player bans last only for that room's lifetime.
- Rooms are private by unguessable link, not password-protected or end-to-end encrypted.
- No public matchmaking, accounts, permanent global leaderboard, or moderation/reporting service is included.

These limits do not block the complete private-game loop.
