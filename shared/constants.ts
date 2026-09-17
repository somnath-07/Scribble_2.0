export const LOGICAL_CANVAS_WIDTH = 800;
export const LOGICAL_CANVAS_HEIGHT = 600;
export const ROOM_ID_LENGTH = 8;
export const ROOM_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const MAX_CHAT_LENGTH = 120;
export const MAX_NICKNAME_LENGTH = 20;
export const MAX_PLAYERS = 20;
export const RECONNECT_GRACE_MS = 60_000;
export const DRAWER_RECONNECT_GRACE_MS = 30_000;
export const EMPTY_ROOM_TTL_MS = 10 * 60 * 1_000;
export const SOCKET_IDLE_TIMEOUT_MS = 120_000;
export const MAX_ROOM_IDENTITIES = 100;
export const WORD_SELECTION_MS = 10_000;
export const TURN_RESULTS_MS = 4_000;
export const MAX_SOCKET_MESSAGE_BYTES = 32_000;
export const MAX_STROKE_POINTS = 120;

export const DRAW_TIMES = [30, 45, 60, 80, 90, 120, 150, 180] as const;
export const BRUSH_SIZES = [2, 5, 10, 20, 40] as const;

export const COLORS = [
  '#ffffff', '#e5e7eb', '#9ca3af', '#111827', '#ef4444', '#991b1b',
  '#f97316', '#facc15', '#84cc16', '#166534', '#22d3ee', '#38bdf8',
  '#2563eb', '#1e3a8a', '#7c3aed', '#a855f7', '#ec4899', '#f9a8d4',
  '#92400e', '#d97706', '#14b8a6', '#475569', '#f5d0a9', '#000000',
] as const;

export const DEFAULT_SETTINGS = {
  playerLimit: 8,
  drawTime: 80,
  rounds: 3,
  wordChoices: 3,
  hints: 2,
  wordMode: 'NORMAL',
  language: 'en',
  customWords: [] as string[],
  customWordsOnly: false,
} as const;
