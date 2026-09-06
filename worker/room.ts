import { DurableObject } from 'cloudflare:workers';
import {
  DEFAULT_SETTINGS,
  DRAWER_RECONNECT_GRACE_MS,
  EMPTY_ROOM_TTL_MS,
  MAX_SOCKET_MESSAGE_BYTES,
  RECONNECT_GRACE_MS,
  TURN_RESULTS_MS,
  WORD_SELECTION_MS,
} from '../shared/constants';
import type {
  CanvasCommand,
  ChatMessage,
  Player,
  PlayerProfile,
  RoomView,
  StoredGameState,
  StoredRoomState,
} from '../shared/game-types';
import { encodeMessage, type ClientMessage, type ServerMessage } from '../shared/protocol';
import {
  calculateDrawerScore,
  calculateGuesserScore,
  getHintCount,
  getHintRevealOrder,
  isCloseGuess,
  maskWord,
  migrateHost,
  normalizeGuess,
  progressTurn,
  restorePlayer,
  selectWordChoices,
  shufflePlayers,
  validateSettings,
} from './game-engine';
import type { Env, SocketAttachment } from './types';
import { parseClientMessage } from './validation';
import { BUILT_IN_WORDS, getWordPool } from './words';

const ROOM_STORAGE_KEY = 'room';

function newGameState(): StoredGameState {
  return {
    phase: 'WAITING',
    currentRound: 0,
    totalRounds: 0,
    turnNumber: 0,
    totalTurns: 0,
    currentDrawerId: null,
    phaseEndsAt: null,
    maskedWord: '',
    drawingOrder: [],
    correctGuesserIds: [],
    canvasCommands: [],
    lastWord: null,
    selectedWord: null,
    wordChoices: [],
    revealedIndices: [],
    eligiblePlayerIds: [],
  };
}

function safeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 20);
}

function socketIsOpen(socket: WebSocket): boolean {
  return socket.readyState === WebSocket.OPEN;
}

export class RoomDurableObject extends DurableObject<Env> {
  private room: StoredRoomState | null = null;
  private ready: Promise<void>;
  private chatWindows = new Map<string, number[]>();
  private drawingDirty = false;
  private nextAlarmAt: number | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ready = this.ctx.blockConcurrencyWhile(async () => {
      this.room = (await this.ctx.storage.get<StoredRoomState>(ROOM_STORAGE_KEY)) ?? null;
      if (this.room && !this.room.activeSessionIds) this.room.activeSessionIds = {};
      this.nextAlarmAt = await this.ctx.storage.getAlarm();
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.ready;
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname.endsWith('/create')) {
      return this.createRoom(request);
    }

    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      if (!this.room) return Response.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 });
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) {
        return Response.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const attachment: SocketAttachment = { playerId: null, sessionId: crypto.randomUUID() };
      server.serializeAttachment(attachment);
      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404 });
  }

  private async createRoom(request: Request): Promise<Response> {
    if (this.room) return Response.json({ error: 'ROOM_EXISTS' }, { status: 409 });
    let payload: unknown;
    try { payload = await request.json(); } catch { return Response.json({ error: 'INVALID_PROFILE' }, { status: 400 }); }
    const parsed = parseClientMessage(JSON.stringify({ type: 'room:join', payload }));
    if (!parsed || parsed.type !== 'room:join') return Response.json({ error: 'INVALID_PROFILE' }, { status: 400 });
    const now = Date.now();
    const profile = parsed.payload;
    const player: Player = {
      ...profile,
      name: safeName(profile.name),
      score: 0,
      connected: false,
      joinedAt: now,
      disconnectedAt: now,
      hasGuessed: false,
      spectator: false,
    };
    this.room = {
      version: 1,
      roomId: new URL(request.url).searchParams.get('roomId') ?? '',
      createdAt: now,
      lastActivityAt: now,
      hostId: profile.id,
      settings: { ...DEFAULT_SETTINGS, customWords: [] },
      players: { [profile.id]: player },
      game: newGameState(),
      chat: [],
      bannedPlayerIds: [],
      activeSessionIds: {},
    };
    await this.save();
    await this.scheduleAlarm(now + RECONNECT_GRACE_MS);
    return Response.json({ roomId: this.room.roomId }, { status: 201 });
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    await this.ready;
    if (!this.room) return this.close(socket, 4404, 'Room not found');
    if (typeof raw !== 'string' || new TextEncoder().encode(raw).byteLength > MAX_SOCKET_MESSAGE_BYTES) {
      return this.error(socket, 'INVALID_MESSAGE', 'That message could not be read.');
    }
    const message = parseClientMessage(raw);
    if (!message) return this.error(socket, 'INVALID_MESSAGE', 'That action was not valid.');
    const attachment = socket.deserializeAttachment() as SocketAttachment | null;
    if (message.type === 'room:join') {
      await this.join(socket, attachment, message.payload);
      return;
    }
    const playerId = attachment?.playerId;
    if (!playerId || !this.room.players[playerId]?.connected) {
      return this.error(socket, 'NOT_JOINED', 'Join the room before doing that.');
    }
    this.room.lastActivityAt = Date.now();
    await this.handleMessage(socket, playerId, message);
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    await this.ready;
    if (!this.room) return;
    const attachment = socket.deserializeAttachment() as SocketAttachment | null;
    const playerId = attachment?.playerId;
    if (!playerId || !this.room.players[playerId]) return;
    if (!attachment || this.room.activeSessionIds[playerId] !== attachment.sessionId) return;
    delete this.room.activeSessionIds[playerId];
    const now = Date.now();
    this.room.players[playerId].connected = false;
    this.room.players[playerId].disconnectedAt = now;
    this.room.lastActivityAt = now;
    this.addSystemMessage(`${this.room.players[playerId].name} lost connection.`);
    await this.save();
    this.broadcast({ type: 'player:left', payload: { playerId, permanent: false } });
    this.broadcastState();
    await this.scheduleNextAlarm();
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    await this.webSocketClose(socket);
  }

  async alarm(): Promise<void> {
    await this.ready;
    this.nextAlarmAt = null;
    if (!this.room) return;
    const now = Date.now();

    if (this.drawingDirty) {
      this.drawingDirty = false;
      await this.save();
    }

    let hostChanged = false;
    for (const player of Object.values(this.room.players)) {
      if (player.connected || player.disconnectedAt === null) continue;
      if (now - player.disconnectedAt < RECONNECT_GRACE_MS) continue;
      delete this.room.players[player.id];
      this.room.game.eligiblePlayerIds = this.room.game.eligiblePlayerIds.filter((id) => id !== player.id);
      if (player.id === this.room.hostId) {
        const nextHost = migrateHost(this.room.players, player.id);
        if (nextHost) {
          this.room.hostId = nextHost;
          hostChanged = true;
        }
      }
      this.broadcast({ type: 'player:left', payload: { playerId: player.id, permanent: true } });
    }

    const game = this.room.game;
    const drawer = game.currentDrawerId ? this.room.players[game.currentDrawerId] : null;
    const drawerTimedOut = drawer && !drawer.connected && drawer.disconnectedAt !== null
      && now - drawer.disconnectedAt >= DRAWER_RECONNECT_GRACE_MS;

    if ((game.phase === 'WORD_SELECTION' || game.phase === 'DRAWING') && drawerTimedOut) {
      if (game.phase === 'DRAWING') await this.endTurn();
      else await this.advanceTurn();
    } else if (game.phase === 'WORD_SELECTION' && game.phaseEndsAt !== null && now >= game.phaseEndsAt) {
      await this.selectWord(game.wordChoices[0]);
    } else if (game.phase === 'DRAWING') {
      if (game.phaseEndsAt !== null && now >= game.phaseEndsAt) {
        await this.endTurn();
      } else {
        this.updateHints(now);
      }
    } else if (game.phase === 'TURN_RESULTS' && game.phaseEndsAt !== null && now >= game.phaseEndsAt) {
      await this.advanceTurn();
    }

    if (hostChanged) this.addSystemMessage(`${this.room.players[this.room.hostId]?.name ?? 'A player'} is now the host.`);
    if (Object.values(this.room.players).every((player) => !player.connected) && now - this.room.lastActivityAt >= EMPTY_ROOM_TTL_MS) {
      await this.ctx.storage.deleteAll();
      this.room = null;
      return;
    }
    await this.save();
    this.broadcastState();
    await this.scheduleNextAlarm();
  }

  private async join(socket: WebSocket, attachment: SocketAttachment | null, profile: PlayerProfile): Promise<void> {
    if (!this.room) return;
    if (attachment?.playerId) return this.error(socket, 'ALREADY_JOINED', 'This connection already joined.');
    if (this.room.bannedPlayerIds.includes(profile.id)) {
      this.send(socket, { type: 'kicked', payload: { reason: 'You were removed from this room.' } });
      return this.close(socket, 4403, 'Kicked');
    }
    const existing = this.room.players[profile.id];
    const connectedCount = Object.values(this.room.players).filter((player) => player.connected && player.id !== profile.id).length;
    if (!existing && connectedCount >= this.room.settings.playerLimit) {
      this.error(socket, 'ROOM_FULL', 'This room is full.');
      return this.close(socket, 4409, 'Room full');
    }

    const now = Date.now();
    const oldSockets = this.socketsFor(profile.id);
    const nextAttachment: SocketAttachment = { playerId: profile.id, sessionId: attachment?.sessionId ?? crypto.randomUUID() };
    socket.serializeAttachment(nextAttachment);
    this.room.activeSessionIds[profile.id] = nextAttachment.sessionId;
    for (const oldSocket of oldSockets) this.close(oldSocket, 4001, 'Reconnected elsewhere');
    const player = existing
      ? { ...restorePlayer(existing, safeName(profile.name), now), avatar: profile.avatar }
      : {
          ...profile,
          name: safeName(profile.name),
          score: 0,
          connected: true,
          joinedAt: now,
          disconnectedAt: null,
          hasGuessed: false,
          spectator: this.room.game.phase !== 'WAITING',
        } satisfies Player;
    this.room.players[profile.id] = player;
    this.room.lastActivityAt = now;
    if (!existing) this.addSystemMessage(`${player.name} joined the room.`);
    await this.save();
    this.broadcast({ type: 'player:joined', payload: { playerId: profile.id } }, socket);
    this.broadcastState();
    await this.scheduleNextAlarm();
  }

  private async handleMessage(socket: WebSocket, playerId: string, message: ClientMessage): Promise<void> {
    if (!this.room) return;
    const player = this.room.players[playerId];
    switch (message.type) {
      case 'room:update-settings':
        if (playerId !== this.room.hostId) return this.error(socket, 'HOST_ONLY', 'Only the host can change settings.');
        if (this.room.game.phase !== 'WAITING') return this.error(socket, 'SETTINGS_LOCKED', 'Settings are locked during a game.');
        this.room.settings = validateSettings(message.payload);
        this.broadcast({ type: 'settings:updated', payload: { settings: this.room.settings } });
        break;
      case 'player:update':
        player.name = safeName(message.payload.name);
        player.avatar = message.payload.avatar;
        this.broadcast({ type: 'player:updated', payload: { playerId } });
        break;
      case 'player:kick':
        await this.kick(socket, playerId, message.payload.playerId);
        return;
      case 'game:start':
        await this.startGame(socket, playerId);
        return;
      case 'game:play-again':
        if (this.room.game.phase !== 'GAME_RESULTS') return this.error(socket, 'INVALID_STATE', 'The game is not over yet.');
        await this.startGame(socket, playerId);
        return;
      case 'game:back-to-lobby':
        if (playerId !== this.room.hostId) return this.error(socket, 'HOST_ONLY', 'Only the host can return everyone to the lobby.');
        if (this.room.game.phase !== 'GAME_RESULTS') return this.error(socket, 'INVALID_STATE', 'The game is not over yet.');
        this.room.game = newGameState();
        for (const roomPlayer of Object.values(this.room.players)) {
          roomPlayer.spectator = false;
          roomPlayer.hasGuessed = false;
          roomPlayer.score = 0;
        }
        this.addSystemMessage('Back in the lobby. Ready for another game!');
        break;
      case 'word:select':
        if (this.room.game.phase !== 'WORD_SELECTION' || this.room.game.currentDrawerId !== playerId) return this.error(socket, 'NOT_DRAWER', 'Only the current drawer can choose a word.');
        if (!this.room.game.wordChoices.includes(message.payload.word)) return this.error(socket, 'INVALID_WORD', 'Choose one of the offered words.');
        await this.selectWord(message.payload.word);
        return;
      case 'draw:stroke':
        if (!this.canDraw(playerId)) return this.error(socket, 'NOT_DRAWER', 'Only the current drawer can draw.');
        this.mergeStroke(message.payload);
        this.broadcast({ type: 'canvas:command', payload: { command: message.payload } });
        this.drawingDirty = true;
        await this.scheduleNextAlarm();
        return;
      case 'draw:fill':
        if (!this.canDraw(playerId)) return this.error(socket, 'NOT_DRAWER', 'Only the current drawer can draw.');
        this.room.game.canvasCommands.push(message.payload);
        this.broadcast({ type: 'canvas:command', payload: { command: message.payload } });
        break;
      case 'draw:undo':
        if (!this.canDraw(playerId)) return this.error(socket, 'NOT_DRAWER', 'Only the current drawer can undo.');
        this.room.game.canvasCommands.pop();
        this.broadcast({ type: 'canvas:undo', payload: { commands: this.room.game.canvasCommands } });
        break;
      case 'draw:clear':
        if (!this.canDraw(playerId)) return this.error(socket, 'NOT_DRAWER', 'Only the current drawer can clear.');
        this.room.game.canvasCommands = [];
        this.broadcast({ type: 'canvas:clear' });
        break;
      case 'chat:message':
        await this.handleChat(socket, playerId, message.payload.text);
        return;
      case 'player:ping':
        this.send(socket, { type: 'pong', payload: { serverTime: Date.now() } });
        return;
    }
    await this.save();
    this.broadcastState();
    await this.scheduleNextAlarm();
  }

  private async startGame(socket: WebSocket, playerId: string): Promise<void> {
    if (!this.room) return;
    if (playerId !== this.room.hostId) return this.error(socket, 'HOST_ONLY', 'Only the host can start the game.');
    if (this.room.game.phase !== 'WAITING' && this.room.game.phase !== 'GAME_RESULTS') return this.error(socket, 'INVALID_STATE', 'A game is already running.');
    const ids = Object.values(this.room.players).filter((player) => player.connected).map((player) => player.id);
    if (ids.length < 2) return this.error(socket, 'NOT_ENOUGH_PLAYERS', 'At least two connected players are needed.');
    for (const roomPlayer of Object.values(this.room.players)) {
      roomPlayer.score = 0;
      roomPlayer.hasGuessed = false;
      roomPlayer.spectator = !ids.includes(roomPlayer.id);
    }
    const drawingOrder = shufflePlayers(ids);
    this.room.game = {
      ...newGameState(),
      phase: 'WORD_SELECTION',
      currentRound: 1,
      totalRounds: this.room.settings.rounds,
      totalTurns: drawingOrder.length * this.room.settings.rounds,
      drawingOrder,
      eligiblePlayerIds: ids,
    };
    await this.beginWordSelection();
    if (this.room.game.currentDrawerId) this.broadcast({ type: 'game:started', payload: { drawerId: this.room.game.currentDrawerId } });
  }

  private async beginWordSelection(): Promise<void> {
    if (!this.room) return;
    const game = this.room.game;
    const drawerId = game.drawingOrder[game.turnNumber % Math.max(1, game.drawingOrder.length)];
    const drawer = drawerId ? this.room.players[drawerId] : null;
    if (!drawer?.connected) {
      await this.advanceTurn();
      return;
    }
    game.phase = 'WORD_SELECTION';
    game.currentRound = Math.floor(game.turnNumber / game.drawingOrder.length) + 1;
    game.currentDrawerId = drawerId;
    game.phaseEndsAt = Date.now() + WORD_SELECTION_MS;
    game.selectedWord = null;
    game.wordChoices = selectWordChoices(this.wordPool(), this.room.settings.wordChoices);
    game.maskedWord = '';
    game.revealedIndices = [];
    game.correctGuesserIds = [];
    game.canvasCommands = [];
    game.lastWord = null;
    for (const player of Object.values(this.room.players)) player.hasGuessed = false;
    this.broadcast({ type: 'turn:choosing', payload: { drawerId } });
    if (game.turnNumber % game.drawingOrder.length === 0) this.broadcast({ type: 'round:started', payload: { round: game.currentRound } });
    await this.save();
    this.broadcastState();
    await this.scheduleNextAlarm();
  }

  private wordPool(): string[] {
    if (!this.room) return BUILT_IN_WORDS;
    const custom = this.room.settings.customWords;
    if (this.room.settings.customWordsOnly && custom.length) return custom;
    return [...getWordPool(this.room.settings.wordMode), ...custom];
  }

  private async selectWord(word: string): Promise<void> {
    if (!this.room || this.room.game.phase !== 'WORD_SELECTION') return;
    const game = this.room.game;
    game.selectedWord = word;
    game.wordChoices = [];
    game.phase = 'DRAWING';
    game.phaseEndsAt = Date.now() + this.room.settings.drawTime * 1_000;
    game.maskedWord = maskWord(word, [], this.room.settings.wordMode);
    this.broadcast({ type: 'turn:started', payload: { drawerId: game.currentDrawerId ?? '' } });
    this.broadcast({ type: 'sound:event', payload: { sound: 'turn' } });
    await this.save();
    this.broadcastState();
    await this.scheduleNextAlarm();
  }

  private updateHints(now: number): void {
    if (!this.room) return;
    const { game, settings } = this.room;
    if (!game.selectedWord || game.phaseEndsAt === null || settings.wordMode === 'HIDDEN') return;
    const total = settings.drawTime * 1_000;
    const elapsed = total - (game.phaseEndsAt - now);
    const count = getHintCount(elapsed, total, settings.hints, game.selectedWord);
    const order = getHintRevealOrder(game.selectedWord);
    if (count > game.revealedIndices.length) {
      game.revealedIndices = order.slice(0, count);
      game.maskedWord = maskWord(game.selectedWord, game.revealedIndices, settings.wordMode);
    }
  }

  private async endTurn(): Promise<void> {
    if (!this.room || this.room.game.phase !== 'DRAWING') return;
    const game = this.room.game;
    game.phase = 'TURN_RESULTS';
    game.lastWord = game.selectedWord;
    game.maskedWord = game.selectedWord?.toLocaleUpperCase('en') ?? '';
    game.phaseEndsAt = Date.now() + TURN_RESULTS_MS;
    this.broadcast({ type: 'turn:ended', payload: { word: game.selectedWord ?? '' } });
    await this.save();
    this.broadcastState();
    await this.scheduleNextAlarm();
  }

  private async advanceTurn(): Promise<void> {
    if (!this.room) return;
    const game = this.room.game;
    const progress = progressTurn(game.turnNumber, game.drawingOrder.length, game.totalRounds);
    game.turnNumber = progress.nextTurnNumber;
    if (progress.finished || game.drawingOrder.length === 0) {
      game.phase = 'GAME_RESULTS';
      game.phaseEndsAt = null;
      game.currentDrawerId = null;
      game.selectedWord = null;
      game.wordChoices = [];
      game.maskedWord = '';
      this.broadcast({ type: 'sound:event', payload: { sound: 'game-end' } });
      await this.save();
      this.broadcast({ type: 'game:ended', payload: { room: this.roomView() } });
      this.broadcastState();
      return;
    }
    await this.beginWordSelection();
  }

  private canDraw(playerId: string): boolean {
    return this.room?.game.phase === 'DRAWING' && this.room.game.currentDrawerId === playerId;
  }

  private mergeStroke(segment: Extract<CanvasCommand, { kind: 'stroke' }>): void {
    if (!this.room) return;
    const commands = this.room.game.canvasCommands;
    const last = commands.at(-1);
    if (last?.kind === 'stroke' && last.strokeId === segment.strokeId && last.tool === segment.tool && last.color === segment.color && last.size === segment.size) {
      const points = segment.points;
      const start = last.points.at(-1);
      const offset = start && points[0]?.x === start.x && points[0]?.y === start.y ? 1 : 0;
      last.points.push(...points.slice(offset));
    } else {
      commands.push({ ...segment, points: [...segment.points] });
    }
  }

  private async handleChat(socket: WebSocket, playerId: string, text: string): Promise<void> {
    if (!this.room) return;
    const now = Date.now();
    const recent = (this.chatWindows.get(playerId) ?? []).filter((time) => now - time < 5_000);
    if (recent.length >= 6) return this.error(socket, 'RATE_LIMITED', 'Slow down for a moment.');
    recent.push(now);
    this.chatWindows.set(playerId, recent);
    const player = this.room.players[playerId];
    const game = this.room.game;

    if (game.phase === 'DRAWING' && game.selectedWord && playerId !== game.currentDrawerId && !player.spectator && !player.hasGuessed) {
      if (normalizeGuess(text) === normalizeGuess(game.selectedWord)) {
        const remaining = Math.max(0, Math.ceil(((game.phaseEndsAt ?? now) - now) / 1_000));
        const score = calculateGuesserScore(remaining, this.room.settings.drawTime);
        player.score += score;
        player.hasGuessed = true;
        game.correctGuesserIds.push(playerId);
        const drawer = game.currentDrawerId ? this.room.players[game.currentDrawerId] : null;
        if (drawer?.connected) drawer.score += calculateDrawerScore(1);
        const message = this.makeMessage(playerId, player.name, `${player.name} guessed the word!`, 'correct');
        this.pushChat(message);
        this.broadcast({ type: 'chat:message', payload: { message } });
        this.broadcast({ type: 'guess:correct', payload: { playerId, score } });
        this.broadcast({ type: 'sound:event', payload: { sound: 'correct' } });
        await this.save();
        this.broadcastState();
        const eligible = game.eligiblePlayerIds.filter((id) => id !== game.currentDrawerId && this.room?.players[id]?.connected);
        if (eligible.length > 0 && eligible.every((id) => this.room?.players[id]?.hasGuessed)) await this.endTurn();
        return;
      }
      if (isCloseGuess(text, game.selectedWord)) {
        const message = this.makeMessage(null, 'Game', "You're close!", 'close');
        this.send(socket, { type: 'guess:close', payload: { text: "You're close!" } });
        this.send(socket, { type: 'chat:message', payload: { message } });
        return;
      }
    }

    const message = this.makeMessage(playerId, player.name, text, 'chat');
    if (game.phase === 'DRAWING' && player.hasGuessed) {
      for (const candidate of this.ctx.getWebSockets()) {
        const candidateId = (candidate.deserializeAttachment() as SocketAttachment | null)?.playerId;
        if (candidateId === game.currentDrawerId || (candidateId && this.room.players[candidateId]?.hasGuessed)) {
          this.send(candidate, { type: 'chat:message', payload: { message } });
        }
      }
      return;
    }
    this.pushChat(message);
    this.broadcast({ type: 'chat:message', payload: { message } });
    await this.save();
    this.broadcastState();
  }

  private async kick(socket: WebSocket, actorId: string, targetId: string): Promise<void> {
    if (!this.room) return;
    if (actorId !== this.room.hostId) return this.error(socket, 'HOST_ONLY', 'Only the host can remove a player.');
    if (targetId === actorId) return this.error(socket, 'INVALID_TARGET', 'The host cannot remove themselves.');
    const target = this.room.players[targetId];
    if (!target) return this.error(socket, 'PLAYER_NOT_FOUND', 'That player is no longer here.');
    this.room.bannedPlayerIds.push(targetId);
    delete this.room.players[targetId];
    this.addSystemMessage(`${target.name} was removed by the host.`);
    for (const targetSocket of this.socketsFor(targetId)) {
      this.send(targetSocket, { type: 'kicked', payload: { reason: 'The host removed you from this room.' } });
      this.close(targetSocket, 4403, 'Kicked');
    }
    await this.save();
    this.broadcastState();
  }

  private roomView(): RoomView {
    if (!this.room) throw new Error('Room unavailable');
    const game = this.room.game;
    return {
      roomId: this.room.roomId,
      hostId: this.room.hostId,
      settings: this.room.settings,
      players: Object.values(this.room.players),
      game: {
        phase: game.phase,
        currentRound: game.currentRound,
        totalRounds: game.totalRounds,
        turnNumber: game.turnNumber,
        totalTurns: game.totalTurns,
        currentDrawerId: game.currentDrawerId,
        phaseEndsAt: game.phaseEndsAt,
        maskedWord: game.maskedWord,
        drawingOrder: game.drawingOrder,
        correctGuesserIds: game.correctGuesserIds,
        canvasCommands: game.canvasCommands,
        lastWord: game.lastWord,
      },
      chat: this.room.chat,
      serverTime: Date.now(),
    };
  }

  private stateMessage(playerId: string): ServerMessage {
    if (!this.room) throw new Error('Room unavailable');
    const privateView: { selectedWord?: string; wordChoices?: string[] } = {};
    if (this.room.game.currentDrawerId === playerId) {
      if (this.room.game.selectedWord) privateView.selectedWord = this.room.game.selectedWord;
      if (this.room.game.wordChoices.length) privateView.wordChoices = this.room.game.wordChoices;
    }
    return { type: 'room:state', payload: { room: this.roomView(), private: privateView } };
  }

  private broadcastState(): void {
    if (!this.room) return;
    for (const socket of this.ctx.getWebSockets()) {
      const playerId = (socket.deserializeAttachment() as SocketAttachment | null)?.playerId;
      if (playerId) this.send(socket, this.stateMessage(playerId));
    }
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    if (!socketIsOpen(socket)) return;
    try { socket.send(encodeMessage(message)); } catch { /* socket will close and reconcile presence */ }
  }

  private broadcast(message: ServerMessage, except?: WebSocket): void {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== except) this.send(socket, message);
    }
  }

  private error(socket: WebSocket, code: string, message: string): void {
    this.send(socket, { type: 'error', payload: { code, message } });
  }

  private close(socket: WebSocket, code: number, reason: string): void {
    try { socket.close(code, reason); } catch { /* already closed */ }
  }

  private socketsFor(playerId: string): WebSocket[] {
    return this.ctx.getWebSockets().filter((socket) => (socket.deserializeAttachment() as SocketAttachment | null)?.playerId === playerId && socketIsOpen(socket));
  }

  private makeMessage(playerId: string | null, playerName: string, text: string, kind: ChatMessage['kind']): ChatMessage {
    return { id: crypto.randomUUID(), playerId, playerName, text, kind, createdAt: Date.now() };
  }

  private pushChat(message: ChatMessage): void {
    if (!this.room) return;
    this.room.chat.push(message);
    this.room.chat = this.room.chat.slice(-100);
  }

  private addSystemMessage(text: string): void {
    this.pushChat(this.makeMessage(null, 'Game', text, 'system'));
  }

  private async save(): Promise<void> {
    if (this.room) await this.ctx.storage.put(ROOM_STORAGE_KEY, this.room);
  }

  private async scheduleAlarm(timestamp: number): Promise<void> {
    if (this.nextAlarmAt !== null && this.nextAlarmAt <= timestamp) return;
    this.nextAlarmAt = timestamp;
    await this.ctx.storage.setAlarm(timestamp);
  }

  private async scheduleNextAlarm(): Promise<void> {
    if (!this.room) return;
    const now = Date.now();
    const candidates: number[] = [];
    const game = this.room.game;
    if (game.phaseEndsAt !== null) candidates.push(game.phaseEndsAt);
    if (this.drawingDirty) candidates.push(now + 750);
    for (const player of Object.values(this.room.players)) {
      if (player.connected || player.disconnectedAt === null) continue;
      candidates.push(player.disconnectedAt + RECONNECT_GRACE_MS);
      if (player.id === game.currentDrawerId && (game.phase === 'WORD_SELECTION' || game.phase === 'DRAWING')) {
        candidates.push(player.disconnectedAt + DRAWER_RECONNECT_GRACE_MS);
      }
    }
    if (game.phase === 'DRAWING' && game.selectedWord && game.phaseEndsAt !== null && this.room.settings.hints > 0 && this.room.settings.wordMode !== 'HIDDEN') {
      const total = this.room.settings.drawTime * 1_000;
      const possible = Math.min(this.room.settings.hints, getHintRevealOrder(game.selectedWord).length);
      const nextHint = game.revealedIndices.length + 1;
      if (nextHint <= possible) candidates.push(game.phaseEndsAt - total + total * (nextHint / (possible + 1)));
    }
    if (Object.values(this.room.players).every((player) => !player.connected)) candidates.push(this.room.lastActivityAt + EMPTY_ROOM_TTL_MS);
    const next = Math.max(now + 1, Math.min(...candidates.filter((candidate) => candidate > now - 5)));
    if (Number.isFinite(next)) await this.scheduleAlarm(next);
  }
}
