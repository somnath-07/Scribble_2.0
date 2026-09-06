import { describe, expect, it } from 'vitest';
import type { Player, RoomSettings } from '../../shared/game-types';
import { ROOM_ID_ALPHABET, ROOM_ID_LENGTH } from '../../shared/constants';
import {
  calculateDrawerScore,
  calculateGuesserScore,
  generateRoomId,
  getHintCount,
  getHintRevealOrder,
  isCloseGuess,
  maskWord,
  migrateHost,
  normalizeGuess,
  parseCustomWords,
  progressTurn,
  restorePlayer,
  selectWordChoices,
  validateSettings,
} from '../../worker/game-engine';
import { BUILT_IN_WORDS, getWordPool } from '../../worker/words';

const avatar = { body: '#f6c7a8', eyes: 0, mouth: 0, accessory: 0 };
const player = (id: string, joinedAt: number, connected = true): Player => ({ id, name: id, avatar, score: 0, connected, joinedAt, disconnectedAt: connected ? null : Date.now(), hasGuessed: false, spectator: false });

describe('room IDs', () => {
  it('uses the unambiguous alphabet and required entropy length', () => {
    const id = generateRoomId(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 31]));
    expect(id).toHaveLength(ROOM_ID_LENGTH);
    expect([...id].every((character) => ROOM_ID_ALPHABET.includes(character))).toBe(true);
  });

  it('maps different random input to different IDs', () => {
    expect(generateRoomId(new Uint8Array(8))).not.toBe(generateRoomId(new Uint8Array(8).fill(1)));
  });
});

describe('words and guesses', () => {
  it('ships at least 500 original local prompts', () => {
    expect(BUILT_IN_WORDS.length).toBeGreaterThanOrEqual(500);
    expect(getWordPool('COMBINATION').every((word) => word.includes(' '))).toBe(true);
  });

  it('selects distinct choices deterministically', () => {
    expect(selectWordChoices(['apple', 'banana', 'cat'], 2, () => 0)).toEqual(['apple', 'banana']);
  });

  it('normalizes case, accents, and repeated whitespace', () => {
    expect(normalizeGuess('  CAFÉ   MUG  ')).toBe('cafe mug');
  });

  it('recognizes genuinely close guesses without accepting them as exact', () => {
    expect(isCloseGuess('bananna', 'banana')).toBe(true);
    expect(isCloseGuess('boat', 'banana')).toBe(false);
    expect(isCloseGuess('banana', 'banana')).toBe(false);
  });

  it('deduplicates custom words case-insensitively', () => {
    expect(parseCustomWords('Banana, banana\n coffee mug, ,Apple')).toEqual(['Banana', 'coffee mug', 'Apple']);
  });
});

describe('score and hints', () => {
  it('rewards faster guesses while clamping the score', () => {
    expect(calculateGuesserScore(80, 80)).toBe(500);
    expect(calculateGuesserScore(40, 80)).toBe(300);
    expect(calculateGuesserScore(0, 80)).toBe(100);
    expect(calculateDrawerScore(25)).toBe(1_000);
  });

  it('distributes hint reveals and never exposes every letter', () => {
    const order = getHintRevealOrder('banana');
    expect(order).toHaveLength(5);
    expect(getHintCount(0, 80_000, 2, 'banana')).toBe(0);
    expect(getHintCount(41_000, 80_000, 2, 'banana')).toBe(1);
    expect(getHintCount(80_000, 80_000, 2, 'banana')).toBe(2);
    expect(maskWord('ice cream', [0, 4], 'NORMAL')).toContain('   ');
    expect(maskWord('banana', order, 'NORMAL')).toContain('_');
    expect(maskWord('banana', [], 'HIDDEN')).toBe('Secret word');
  });
});

describe('room progression and validation', () => {
  it('progresses every player once per round and finishes exactly once', () => {
    expect(progressTurn(0, 4, 3)).toEqual({ finished: false, nextTurnNumber: 1, round: 1, drawerIndex: 1 });
    expect(progressTurn(3, 4, 3)).toEqual({ finished: false, nextTurnNumber: 4, round: 2, drawerIndex: 0 });
    expect(progressTurn(11, 4, 3).finished).toBe(true);
  });

  it('migrates host to the longest-connected player', () => {
    expect(migrateHost({ old: player('old', 1, false), late: player('late', 30), early: player('early', 10) }, 'old')).toBe('early');
  });

  it('restores a reconnecting player without resetting score or join time', () => {
    const disconnected = { ...player('p1', 10, false), score: 420 };
    const restored = restorePlayer(disconnected, 'New Name', 500);
    expect(restored).toMatchObject({ connected: true, disconnectedAt: null, score: 420, joinedAt: 10, name: 'New Name' });
  });

  it('bounds every host setting and filters unsupported draw times', () => {
    const invalid = { playerLimit: 99, drawTime: 71, rounds: 0, wordChoices: 99, hints: -2, wordMode: 'BROKEN', language: 'en', customWords: [' Cat ', 'cat'], customWordsOnly: true } as unknown as RoomSettings;
    expect(validateSettings(invalid)).toEqual({ playerLimit: 20, drawTime: 80, rounds: 1, wordChoices: 5, hints: 0, wordMode: 'NORMAL', language: 'en', customWords: ['Cat'], customWordsOnly: true });
  });
});
