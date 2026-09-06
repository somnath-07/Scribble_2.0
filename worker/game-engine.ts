import { DEFAULT_SETTINGS, DRAW_TIMES, ROOM_ID_ALPHABET, ROOM_ID_LENGTH } from '../shared/constants';
import type { Player, RoomSettings, WordMode } from '../shared/game-types';

export function generateRoomId(bytes?: Uint8Array): string {
  const source = bytes ?? crypto.getRandomValues(new Uint8Array(ROOM_ID_LENGTH));
  return Array.from(source.slice(0, ROOM_ID_LENGTH), (value) => ROOM_ID_ALPHABET[value % ROOM_ID_ALPHABET.length]).join('');
}

export function normalizeGuess(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('en')
    .replace(/\s+/g, ' ');
}

export function levenshtein(left: string, right: string): number {
  const a = normalizeGuess(left);
  const b = normalizeGuess(right);
  const previous = new Uint16Array(b.length + 1);
  const current = new Uint16Array(b.length + 1);
  for (let index = 0; index <= b.length; index += 1) previous[index] = index;
  for (let row = 1; row <= a.length; row += 1) {
    current[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
    }
    previous.set(current);
  }
  return previous[b.length];
}

export function isCloseGuess(guess: string, answer: string): boolean {
  const normalizedGuess = normalizeGuess(guess);
  const normalizedAnswer = normalizeGuess(answer);
  if (normalizedGuess === normalizedAnswer || normalizedAnswer.length < 4) return false;
  const distance = levenshtein(normalizedGuess, normalizedAnswer);
  const maximum = normalizedAnswer.length <= 7 ? 1 : 2;
  return distance <= maximum && 1 - distance / Math.max(normalizedGuess.length, normalizedAnswer.length) >= 0.78;
}

export function calculateGuesserScore(remainingSeconds: number, totalSeconds: number): number {
  const progress = Math.max(0, Math.min(1, remainingSeconds / Math.max(1, totalSeconds)));
  return Math.max(100, Math.min(500, Math.round(100 + 400 * progress)));
}

export function calculateDrawerScore(successfulGuessers: number): number {
  return Math.max(0, Math.min(1_000, successfulGuessers * 100));
}

export function parseCustomWords(input: string | string[]): string[] {
  const pieces = Array.isArray(input) ? input : input.split(/[\n,]/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const piece of pieces) {
    const value = piece.trim().replace(/\s+/g, ' ').slice(0, 40);
    const key = normalizeGuess(value);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result.slice(0, 500);
}

export function validateSettings(input: RoomSettings): RoomSettings {
  const drawTime = DRAW_TIMES.includes(input.drawTime as (typeof DRAW_TIMES)[number]) ? input.drawTime : DEFAULT_SETTINGS.drawTime;
  const wordModes: WordMode[] = ['NORMAL', 'HIDDEN', 'COMBINATION'];
  return {
    playerLimit: Math.round(Math.max(2, Math.min(20, input.playerLimit))),
    drawTime,
    rounds: Math.round(Math.max(1, Math.min(10, input.rounds))),
    wordChoices: Math.round(Math.max(1, Math.min(5, input.wordChoices))),
    hints: Math.round(Math.max(0, Math.min(5, input.hints))),
    wordMode: wordModes.includes(input.wordMode) ? input.wordMode : 'NORMAL',
    language: 'en',
    customWords: parseCustomWords(input.customWords),
    customWordsOnly: Boolean(input.customWordsOnly),
  };
}

export function selectWordChoices(words: readonly string[], count: number, random: () => number = Math.random): string[] {
  const pool = [...new Set(words.map((word) => word.trim()).filter(Boolean))];
  const result: string[] = [];
  const limit = Math.min(Math.max(1, count), pool.length);
  while (result.length < limit) {
    const index = Math.floor(random() * pool.length);
    result.push(pool[index]);
    pool.splice(index, 1);
  }
  return result;
}

export function shufflePlayers(ids: string[], random: () => number = Math.random): string[] {
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function maskWord(word: string, revealedIndices: readonly number[], mode: WordMode): string {
  if (mode === 'HIDDEN') return 'Secret word';
  const revealed = new Set(revealedIndices);
  return Array.from(word, (character, index) => {
    if (/\s/.test(character)) return '   ';
    if (/[-'’]/.test(character)) return character;
    return revealed.has(index) ? character.toLocaleUpperCase('en') : '_';
  }).join(' ');
}

export function getHintRevealOrder(word: string): number[] {
  const candidates = Array.from(word)
    .map((character, index) => ({ character, index }))
    .filter(({ character }) => /[\p{L}\p{N}]/u.test(character));
  const maxReveal = Math.max(0, candidates.length - 1);
  return candidates
    .sort((a, b) => {
      const hashA = ((a.index + 1) * 1103515245 + word.length * 12345) >>> 0;
      const hashB = ((b.index + 1) * 1103515245 + word.length * 12345) >>> 0;
      return hashA - hashB;
    })
    .slice(0, maxReveal)
    .map(({ index }) => index);
}

export function getHintCount(elapsedMs: number, totalMs: number, configuredHints: number, word: string): number {
  const possible = Math.min(configuredHints, getHintRevealOrder(word).length);
  if (possible === 0) return 0;
  const progress = Math.max(0, Math.min(1, elapsedMs / Math.max(1, totalMs)));
  return Math.min(possible, Math.floor(progress * (possible + 1)));
}

export function progressTurn(turnNumber: number, playerCount: number, rounds: number): {
  finished: boolean;
  nextTurnNumber: number;
  round: number;
  drawerIndex: number;
} {
  const nextTurnNumber = turnNumber + 1;
  const totalTurns = playerCount * rounds;
  return {
    finished: nextTurnNumber >= totalTurns,
    nextTurnNumber,
    round: Math.floor(nextTurnNumber / Math.max(1, playerCount)) + 1,
    drawerIndex: nextTurnNumber % Math.max(1, playerCount),
  };
}

export function migrateHost(players: Record<string, Player>, previousHostId: string): string | null {
  const connected = Object.values(players)
    .filter((player) => player.connected && player.id !== previousHostId)
    .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
  return connected[0]?.id ?? null;
}

export function restorePlayer(existing: Player, name: string, now: number): Player {
  return { ...existing, name, connected: true, disconnectedAt: null, joinedAt: Math.min(existing.joinedAt, now) };
}
