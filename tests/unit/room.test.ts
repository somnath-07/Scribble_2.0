import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ROOM_TTL_MS, SOCKET_IDLE_TIMEOUT_MS } from '../../shared/constants';
import type { PlayerProfile, StoredRoomState } from '../../shared/game-types';
import type { ClientMessage, ServerMessage } from '../../shared/protocol';
import { rankedPlayers } from '../../shared/rankings';
import { RoomDurableObject } from '../../worker/room';
import type { Env, SocketAttachment } from '../../worker/types';

class TestSocket {
  readyState = 1;
  messages: ServerMessage[] = [];
  closedCode: number | null = null;
  attachment: SocketAttachment = { playerId: null, sessionId: crypto.randomUUID(), lastSeenAt: Date.now() };
  serializeAttachment(value: SocketAttachment) { this.attachment = structuredClone(value); }
  deserializeAttachment() { return structuredClone(this.attachment); }
  send(raw: string) { this.messages.push(JSON.parse(raw)); }
  close(code: number) { this.closedCode = code; this.readyState = 3; }
  get websocket() { return this as unknown as WebSocket; }
  get state() { return this.messages.filter((item) => item.type === 'room:state').at(-1)!.payload; }
}

const profile = (name: string): PlayerProfile => ({ id: crypto.randomUUID(), reconnectToken: crypto.randomUUID(), name, avatar: { body: '#ff303f', eyes: 2, mouth: 1, accessory: 3 } });

async function setup(count = 2) {
  const snapshots = new Map<string, unknown>();
  let alarmAt: number | null = null;
  const sockets: TestSocket[] = [];
  const autoResponses = new Map<WebSocket, Date>();
  const storage = {
    get: async (key: string) => structuredClone(snapshots.get(key)),
    put: async (key: string, value: unknown) => { snapshots.set(key, structuredClone(value)); },
    getAlarm: async () => alarmAt,
    setAlarm: async (time: number) => { alarmAt = time; },
    deleteAlarm: async () => { alarmAt = null; },
    deleteAll: async () => { snapshots.clear(); },
  };
  const ctx = {
    storage,
    blockConcurrencyWhile: (callback: () => Promise<void>) => callback(),
    setWebSocketAutoResponse: vi.fn(),
    getWebSocketAutoResponseTimestamp: (socket: WebSocket) => autoResponses.get(socket) ?? null,
    getWebSockets: () => sockets.filter((socket) => socket.readyState === 1).map((socket) => socket.websocket),
  } as unknown as DurableObjectState;
  const env = {} as Env;
  let room = new RoomDurableObject(ctx, env);
  const profiles = Array.from({ length: count }, (_, index) => profile(`Player ${index}`));
  expect((await room.fetch(new Request('https://room.internal/create?roomId=ABCDEFGH', { method: 'POST', body: JSON.stringify(profiles[0]) }))).status).toBe(201);
  const send = (socket: TestSocket, message: ClientMessage) => room.webSocketMessage(socket.websocket, JSON.stringify(message));
  const join = async (identity: PlayerProfile) => {
    // Keep arrival order explicit instead of tying every join on the frozen test clock.
    vi.setSystemTime(Date.now() + 1);
    const socket = new TestSocket();
    sockets.push(socket);
    await send(socket, { type: 'room:join', payload: identity });
    return socket;
  };
  for (const identity of profiles) await join(identity);
  const disconnect = async (socket: TestSocket) => { socket.close(1000); await room.webSocketClose(socket.websocket); };
  const advance = async (ms: number, keepAlive: TestSocket[] = []) => {
    vi.setSystemTime(Date.now() + ms);
    for (const socket of keepAlive) autoResponses.set(socket.websocket, new Date());
    alarmAt = null;
    await room.alarm();
  };
  const stored = () => structuredClone(snapshots.get('room')) as StoredRoomState;
  const startDrawing = async () => {
    await send(sockets[0], { type: 'game:start' });
    const drawer = sockets.find((socket) => socket.state.private.wordChoices?.length)!;
    const word = drawer.state.private.wordChoices![0];
    await send(drawer, { type: 'word:select', payload: { word } });
    return { drawer, guessers: sockets.filter((socket) => socket !== drawer), word };
  };
  return { profiles, sockets, join, disconnect, send, advance, stored, startDrawing, status: () => room.fetch(new Request('https://room.internal/status')), reload: () => { room = new RoomDurableObject(ctx, env); }, alarm: () => alarmAt };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-16T10:00:00Z'));
  vi.stubGlobal('WebSocketRequestResponsePair', class {});
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('durable room reconnect behavior', () => {
  it('transfers ownership immediately on an explicit leave and keeps a lone connected host beyond ten minutes', async () => {
    const h = await setup(3);
    await h.send(h.sockets[0], { type: 'room:leave' });
    expect(h.stored().hostId).toBe(h.profiles[1].id);
    expect(h.sockets[0].messages.at(-1)).toEqual({ type: 'room:left' });
    await h.send(h.sockets[2], { type: 'room:leave' });
    await h.advance(20 * 60_000, [h.sockets[1]]);
    expect((await h.status()).status).toBe(200);
    expect(h.stored().emptySince).toBeNull();
    expect(h.stored().players[h.profiles[1].id].connected).toBe(true);
    expect(h.sockets[1].closedCode).toBeNull();
    await h.send(h.sockets[1], { type: 'room:leave' });
    await h.advance(EMPTY_ROOM_TTL_MS - 1);
    expect((await h.status()).status).toBe(200);
    await h.advance(1);
    expect((await h.status()).status).toBe(404);
  });

  it('rejects kick requests during every game phase, even when sent by the host', async () => {
    const h = await setup();
    await h.send(h.sockets[0], { type: 'game:start' });
    await h.send(h.sockets[0], { type: 'player:kick', payload: { playerId: h.profiles[1].id } });
    expect(h.sockets[0].messages.at(-1)).toMatchObject({ type: 'error', payload: { code: 'KICK_LOCKED' } });
    const drawer = h.sockets.find((socket) => socket.state.private.wordChoices?.length)!;
    const word = drawer.state.private.wordChoices![0];
    await h.send(drawer, { type: 'word:select', payload: { word } });
    await h.send(h.sockets[0], { type: 'player:kick', payload: { playerId: h.profiles[1].id } });
    expect(h.sockets[0].messages.at(-1)).toMatchObject({ type: 'error', payload: { code: 'KICK_LOCKED' } });
    const guesser = h.sockets.find((socket) => socket !== drawer)!;
    await h.send(guesser, { type: 'chat:message', payload: { text: word } });
    expect(h.stored().game.phase).toBe('TURN_RESULTS');
    await h.send(h.sockets[0], { type: 'player:kick', payload: { playerId: h.profiles[1].id } });
    expect(h.stored().players[h.profiles[1].id].connected).toBe(true);
    expect(h.stored().bannedPlayerIds).toEqual([]);
  });

  it('declares the remaining participant the winner immediately when the other player deliberately leaves', async () => {
    const h = await setup();
    await h.startDrawing();
    await h.send(h.sockets[0], { type: 'room:leave' });
    expect(h.stored().game).toMatchObject({ phase: 'GAME_RESULTS', winnerId: h.profiles[1].id, phaseEndsAt: null });
    expect(h.stored().hostId).toBe(h.profiles[1].id);
    expect(h.sockets[1].state.room.game.winnerId).toBe(h.profiles[1].id);
    await h.send(h.sockets[1], { type: 'player:kick', payload: { playerId: h.profiles[0].id } });
    expect(h.sockets[1].messages.at(-1)).toMatchObject({ type: 'error', payload: { code: 'KICK_LOCKED' } });
  });

  it('ranks a last-player winner first regardless of score and excludes spectators without mutating room order', async () => {
    const h = await setup(3);
    await h.startDrawing();
    const viewer = await h.join(profile('Spectator'));
    const room = viewer.state.room;
    room.players[0].score = 800;
    room.players[1].score = 100;
    room.players[2].score = 800;
    room.players[2].joinedAt = room.players[0].joinedAt + 1;
    room.players[3].score = 9999;
    const originalOrder = room.players.map(player => player.id);
    expect(rankedPlayers(room).map(player => player.id)).toEqual([h.profiles[0].id, h.profiles[2].id, h.profiles[1].id]);
    room.game.winnerId = h.profiles[1].id;
    expect(rankedPlayers(room).map(player => player.id)).toEqual([h.profiles[1].id, h.profiles[0].id, h.profiles[2].id]);
    expect(room.players.map(player => player.id)).toEqual(originalOrder);
  });

  it('allows a temporary network reconnect but ends a game after the last opponent exceeds grace', async () => {
    const h = await setup();
    await h.startDrawing();
    await h.disconnect(h.sockets[0]);
    await h.advance(20_000, [h.sockets[1]]);
    expect(h.stored().game.winnerId).toBeNull();
    const returned = await h.join(h.profiles[0]);
    expect(h.stored().game.winnerId).toBeNull();
    await h.disconnect(returned);
    await h.advance(60_000, [h.sockets[1]]);
    expect(h.stored().game).toMatchObject({ phase: 'GAME_RESULTS', winnerId: h.profiles[1].id });
  });

  it('supports one changeable reaction per non-drawer, preserves it on reconnect and rejects stale-turn votes', async () => {
    const h = await setup(3);
    const { drawer, guessers, word } = await h.startDrawing();
    const react = (socket: TestSocket, vote: 'like' | 'dislike' | null, turnNumber = 0) => h.send(socket, { type: 'drawing:react', payload: { vote, turnNumber } });
    await react(drawer, 'like');
    expect(drawer.messages.at(-1)).toMatchObject({ type: 'error', payload: { code: 'OWN_DRAWING' } });
    await react(guessers[0], 'like');
    await react(guessers[0], 'like');
    expect(drawer.state.room.game.drawingLikes).toBe(1);
    await react(guessers[0], 'dislike');
    expect(drawer.state.room.game).toMatchObject({ drawingLikes: 0, drawingDislikes: 1 });
    const identity = h.profiles.find((p) => p.id === guessers[0].attachment.playerId)!;
    await h.disconnect(guessers[0]);
    const returned = await h.join(identity);
    expect(returned.state.private.drawingReaction).toBe('dislike');
    await react(returned, null);
    await react(guessers[1], 'like');
    for (const guesser of [returned, guessers[1]]) await h.send(guesser, { type: 'chat:message', payload: { text: word } });
    await react(returned, 'like');
    expect(drawer.state.room.game.drawingLikes).toBe(2);
    await h.advance(4_000, [drawer, returned, guessers[1]]);
    expect(h.stored().game.drawingVotes).toEqual({});
    await react(returned, 'like', 0);
    expect(returned.messages.at(-1)).toMatchObject({ type: 'error', payload: { code: 'REACTION_CLOSED' } });
  });

  it('retains earned scores after the old 60-second deletion window and a runtime restart', async () => {
    const h = await setup(3);
    const { guessers, word } = await h.startDrawing();
    const player = guessers[0];
    await h.send(player, { type: 'chat:message', payload: { text: word } });
    const id = player.attachment.playerId!;
    const earned = h.stored().players[id].score;
    expect(earned).toBeGreaterThan(0);
    await h.disconnect(player);
    await h.advance(5 * 60_000, h.sockets.filter((socket) => socket !== player));
    h.reload();
    const returned = await h.join(h.profiles.find((item) => item.id === id)!);
    expect(returned.state.room.players.find((item) => item.id === id)).toMatchObject({ score: earned, connected: true, spectator: false });
  });

  it('pauses an empty drawing room, restores canvas and timer after nine minutes, then expires after ten empty minutes', async () => {
    const h = await setup();
    const { drawer } = await h.startDrawing();
    await h.send(drawer, { type: 'draw:stroke', payload: { kind: 'stroke', strokeId: 'stroke-one', tool: 'brush', color: '#111827', size: 10, points: [{ x: 20, y: 30 }] } });
    for (const socket of [...h.sockets]) await h.disconnect(socket);
    const paused = h.stored();
    expect(paused.game.pausedAt).toBe(Date.now());
    const remaining = paused.game.phaseEndsAt! - Date.now();
    await h.advance(9 * 60_000);
    h.reload();
    const identity = h.profiles.find((item) => item.id === drawer.attachment.playerId)!;
    const returned = await h.join(identity);
    expect(returned.state.room.game).toMatchObject({ phase: 'DRAWING', pausedAt: null, currentDrawerId: identity.id });
    expect(returned.state.room.game.phaseEndsAt! - Date.now()).toBe(remaining);
    expect(returned.state.room.game.canvasCommands).toHaveLength(1);
    await h.disconnect(returned);
    await h.advance(EMPTY_ROOM_TTL_MS - 1);
    expect((await h.status()).status).toBe(200);
    await h.advance(1);
    expect((await h.status()).status).toBe(404);
    expect(h.alarm()).toBeNull();
  });

  it('expires on the next request even if delivery of its alarm was delayed', async () => {
    const h = await setup(1);
    await h.disconnect(h.sockets[0]);
    vi.setSystemTime(Date.now() + EMPTY_ROOM_TTL_MS);
    expect((await h.status()).status).toBe(404);
  });

  it('does not declare a premature winner while players return to a long-paused empty room', async () => {
    const h = await setup();
    const { drawer } = await h.startDrawing();
    for (const socket of [...h.sockets]) await h.disconnect(socket);
    await h.advance(9 * 60_000);
    const drawerId = drawer.attachment.playerId!;
    const returned = await h.join(h.profiles.find(player => player.id === drawerId)!);
    await h.advance(5_000, [returned]);
    expect(h.stored().game.winnerId).toBeNull();
    expect(h.stored().game.phase).toBe('DRAWING');
    await h.join(h.profiles.find(player => player.id !== drawerId)!);
    expect(h.stored().game.winnerId).toBeNull();
  });

  it('transfers host after 60 seconds without deleting the previous host', async () => {
    const h = await setup();
    await h.disconnect(h.sockets[0]);
    await h.advance(60_000, [h.sockets[1]]);
    expect(h.stored().hostId).toBe(h.profiles[1].id);
    expect(h.stored().players[h.profiles[0].id]).toBeDefined();
    const returned = await h.join(h.profiles[0]);
    expect(returned.state.room.hostId).toBe(h.profiles[1].id);
  });

  it('rejects stolen public IDs and never broadcasts private reconnect keys', async () => {
    const h = await setup();
    const imposter = await h.join({ ...h.profiles[0], reconnectToken: crypto.randomUUID() });
    expect(imposter.closedCode).toBe(4401);
    expect(h.sockets[0].readyState).toBe(1);
    const publicMessages = JSON.stringify(h.sockets.flatMap((socket) => socket.messages));
    for (const identity of h.profiles) expect(publicMessages).not.toContain(identity.reconnectToken);
  });

  it('ignores stale socket closes and actions after same-identity takeover', async () => {
    const h = await setup();
    const previous = h.sockets[0];
    const replacement = await h.join(h.profiles[0]);
    expect(previous.closedCode).toBe(4001);
    await h.disconnect(previous);
    await h.send(previous, { type: 'game:start' });
    expect(h.stored().game.phase).toBe('WAITING');
    expect(h.stored().players[h.profiles[0].id].connected).toBe(true);
    await h.send(replacement, { type: 'game:start' });
    expect(h.stored().game.phase).toBe('WORD_SELECTION');
  });

  it('awards the disconnected drawer points for a correct guess during grace', async () => {
    const h = await setup(3);
    const { drawer, guessers, word } = await h.startDrawing();
    await h.disconnect(drawer);
    await h.send(guessers[0], { type: 'chat:message', payload: { text: word } });
    expect(h.stored().players[drawer.attachment.playerId!].score).toBe(100);
    await h.advance(30_000, guessers);
    expect(h.stored().game.phase).toBe('TURN_RESULTS');
  });

  it('does not let a returning identity exceed the connected-player limit', async () => {
    const h = await setup();
    await h.send(h.sockets[0], { type: 'room:update-settings', payload: { ...h.stored().settings, playerLimit: 2 } });
    await h.disconnect(h.sockets[1]);
    await h.join(profile('Replacement guest'));
    const returned = await h.join(h.profiles[1]);
    expect(returned.closedCode).toBe(4409);
  });

  it('detects dead connections while hibernation auto-pongs keep live sockets connected', async () => {
    const h = await setup();
    await h.advance(SOCKET_IDLE_TIMEOUT_MS, [h.sockets[0]]);
    expect(h.stored().players[h.profiles[0].id].connected).toBe(true);
    expect(h.stored().players[h.profiles[1].id].connected).toBe(false);
    await h.advance(SOCKET_IDLE_TIMEOUT_MS);
    expect(h.stored().emptySince).toBe(Date.now());
    await h.advance(EMPTY_ROOM_TTL_MS);
    expect((await h.status()).status).toBe(404);
  });

  it('never re-awards a solved guess on reconnect', async () => {
    const h = await setup(3);
    const { guessers, word } = await h.startDrawing();
    const solved = guessers[0];
    await h.send(solved, { type: 'chat:message', payload: { text: word } });
    const id = solved.attachment.playerId!;
    const earned = h.stored().players[id].score;
    await h.disconnect(solved);
    const returned = await h.join(h.profiles.find((item) => item.id === id)!);
    await h.send(returned, { type: 'chat:message', payload: { text: word } });
    expect(h.stored().players[id].score).toBe(earned);
    expect(h.stored().game.correctGuesserIds.filter((item) => item === id)).toHaveLength(1);
  });
});
