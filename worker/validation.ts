import { BRUSH_SIZES, COLORS, LOGICAL_CANVAS_HEIGHT, LOGICAL_CANVAS_WIDTH, MAX_CHAT_LENGTH, MAX_NICKNAME_LENGTH, MAX_STROKE_POINTS } from '../shared/constants';
import type { ClientMessage } from '../shared/protocol';
import type { AvatarConfig, FillCommand, PlayerProfile, RoomSettings, StrokeCommand } from '../shared/game-types';
import { validateSettings } from './game-engine';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}

function isAvatar(value: unknown): value is AvatarConfig {
  if (!isRecord(value)) return false;
  return isString(value.body, 9) && /^#[0-9a-f]{6}$/i.test(value.body)
    && Number.isInteger(value.eyes) && Number(value.eyes) >= 0 && Number(value.eyes) <= 5
    && Number.isInteger(value.mouth) && Number(value.mouth) >= 0 && Number(value.mouth) <= 5
    && Number.isInteger(value.accessory) && Number(value.accessory) >= 0 && Number(value.accessory) <= 5;
}

function isProfile(value: unknown): value is PlayerProfile {
  if (!isRecord(value)) return false;
  return isString(value.id, 64) && /^[a-zA-Z0-9-]+$/.test(value.id)
    && isString(value.name, MAX_NICKNAME_LENGTH) && value.name.trim().length > 0
    && isAvatar(value.avatar);
}

function isPoint(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.x === 'number' && Number.isFinite(value.x) && value.x >= 0 && value.x <= LOGICAL_CANVAS_WIDTH
    && typeof value.y === 'number' && Number.isFinite(value.y) && value.y >= 0 && value.y <= LOGICAL_CANVAS_HEIGHT;
}

function isStroke(value: unknown): value is StrokeCommand {
  if (!isRecord(value)) return false;
  return value.kind === 'stroke' && isString(value.strokeId, 64)
    && (value.tool === 'brush' || value.tool === 'eraser')
    && isString(value.color, 9) && COLORS.includes(value.color as (typeof COLORS)[number])
    && BRUSH_SIZES.includes(value.size as (typeof BRUSH_SIZES)[number])
    && Array.isArray(value.points) && value.points.length >= 1 && value.points.length <= MAX_STROKE_POINTS
    && value.points.every(isPoint);
}

function isFill(value: unknown): value is FillCommand {
  if (!isRecord(value)) return false;
  return value.kind === 'fill' && Number.isFinite(value.x) && Number(value.x) >= 0 && Number(value.x) <= LOGICAL_CANVAS_WIDTH
    && Number.isFinite(value.y) && Number(value.y) >= 0 && Number(value.y) <= LOGICAL_CANVAS_HEIGHT
    && isString(value.color, 9) && COLORS.includes(value.color as (typeof COLORS)[number]);
}

function isSettings(value: unknown): value is RoomSettings {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.customWords)) return false;
  return ['playerLimit', 'drawTime', 'rounds', 'wordChoices', 'hints'].every((key) => typeof value[key] === 'number')
    && typeof value.wordMode === 'string' && value.language === 'en' && typeof value.customWordsOnly === 'boolean'
    && value.customWords.every((word) => isString(word, 40));
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!isRecord(parsed) || typeof parsed.type !== 'string') return null;
  const payload = parsed.payload;
  switch (parsed.type) {
    case 'room:join': return isProfile(payload) ? { type: parsed.type, payload } : null;
    case 'room:update-settings': return isSettings(payload) ? { type: parsed.type, payload: validateSettings(payload) } : null;
    case 'player:update':
      return isRecord(payload) && isString(payload.name, MAX_NICKNAME_LENGTH) && payload.name.trim().length > 0 && isAvatar(payload.avatar)
        ? { type: parsed.type, payload: { name: payload.name.trim(), avatar: payload.avatar } } : null;
    case 'player:kick': return isRecord(payload) && isString(payload.playerId, 64) ? { type: parsed.type, payload: { playerId: payload.playerId } } : null;
    case 'word:select': return isRecord(payload) && isString(payload.word, 80) ? { type: parsed.type, payload: { word: payload.word } } : null;
    case 'draw:stroke': return isStroke(payload) ? { type: parsed.type, payload } : null;
    case 'draw:fill': return isFill(payload) ? { type: parsed.type, payload } : null;
    case 'chat:message': return isRecord(payload) && isString(payload.text, MAX_CHAT_LENGTH) && payload.text.trim().length > 0 ? { type: parsed.type, payload: { text: payload.text.trim() } } : null;
    case 'player:ping':
    case 'game:start':
    case 'game:play-again':
    case 'game:back-to-lobby':
    case 'draw:undo':
    case 'draw:clear':
      return { type: parsed.type } as ClientMessage;
    default: return null;
  }
}
