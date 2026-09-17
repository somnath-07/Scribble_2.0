export type RoomPhase = 'WAITING' | 'WORD_SELECTION' | 'DRAWING' | 'TURN_RESULTS' | 'GAME_RESULTS';
export type WordMode = 'NORMAL' | 'HIDDEN' | 'COMBINATION';
export type DrawTool = 'brush' | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface AvatarConfig {
  body: string;
  eyes: number;
  mouth: number;
  accessory: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: AvatarConfig;
  reconnectToken: string;
}

export interface Player extends Omit<PlayerProfile, 'reconnectToken'> {
  score: number;
  connected: boolean;
  joinedAt: number;
  disconnectedAt: number | null;
  hasGuessed: boolean;
  spectator: boolean;
}

export interface RoomSettings {
  playerLimit: number;
  drawTime: number;
  rounds: number;
  wordChoices: number;
  hints: number;
  wordMode: WordMode;
  language: 'en';
  customWords: string[];
  customWordsOnly: boolean;
}

export interface StrokeCommand {
  kind: 'stroke';
  strokeId: string;
  tool: DrawTool;
  color: string;
  size: number;
  points: Point[];
}

export interface FillCommand {
  kind: 'fill';
  x: number;
  y: number;
  color: string;
}

export type CanvasCommand = StrokeCommand | FillCommand;

export interface ChatMessage {
  id: string;
  playerId: string | null;
  playerName: string;
  text: string;
  kind: 'chat' | 'system' | 'correct' | 'close';
  createdAt: number;
}

export interface PublicGameState {
  phase: RoomPhase;
  currentRound: number;
  totalRounds: number;
  turnNumber: number;
  totalTurns: number;
  currentDrawerId: string | null;
  phaseEndsAt: number | null;
  pausedAt: number | null;
  maskedWord: string;
  drawingOrder: string[];
  correctGuesserIds: string[];
  canvasCommands: CanvasCommand[];
  lastWord: string | null;
  winnerId: string | null;
  drawingLikes: number;
  drawingDislikes: number;
}

export interface RoomView {
  roomId: string;
  hostId: string;
  settings: RoomSettings;
  players: Player[];
  game: PublicGameState;
  chat: ChatMessage[];
  serverTime: number;
}

export interface PrivateGameView {
  selectedWord?: string;
  wordChoices?: string[];
  drawingReaction?: 'like' | 'dislike' | null;
}

export interface StoredGameState extends PublicGameState {
  selectedWord: string | null;
  wordChoices: string[];
  revealedIndices: number[];
  eligiblePlayerIds: string[];
  leftPlayerIds: string[];
  drawingVotes: Record<string, 'like' | 'dislike'>;
}

export interface StoredRoomState {
  version: 1;
  roomId: string;
  createdAt: number;
  lastActivityAt: number;
  hostId: string;
  settings: RoomSettings;
  players: Record<string, Player>;
  game: StoredGameState;
  chat: ChatMessage[];
  bannedPlayerIds: string[];
  activeSessionIds: Record<string, string>;
  playerTokens: Record<string, string>;
  emptySince: number | null;
}
