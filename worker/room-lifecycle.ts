import { EMPTY_ROOM_TTL_MS, RECONNECT_GRACE_MS } from '../shared/constants';
import type { StoredRoomState } from '../shared/game-types';
import { migrateHost } from './game-engine';

export function roomHasExpired(room: StoredRoomState, now: number): boolean {
  return room.emptySince !== null && now >= room.emptySince + EMPTY_ROOM_TTL_MS;
}

export function pauseEmptyRoom(room: StoredRoomState, now: number): void {
  if (Object.values(room.players).some((player) => player.connected)) return;
  room.emptySince ??= now;
  if (room.game.phaseEndsAt !== null) room.game.pausedAt ??= now;
}

export function resumeRoom(room: StoredRoomState, now: number): void {
  const game = room.game;
  if (game.pausedAt !== null) {
    const pausedFor = Math.max(0, now - game.pausedAt);
    if (game.phaseEndsAt !== null) game.phaseEndsAt += pausedFor;
    // Empty-room time must not consume opponents' reconnect grace either.
    for (const player of Object.values(room.players)) {
      if (!player.connected && player.disconnectedAt !== null) player.disconnectedAt += pausedFor;
    }
    game.pausedAt = null;
  }
  room.emptySince = null;
}

export function transferAbsentHost(room: StoredRoomState, now: number, immediate = false): boolean {
  const host = room.players[room.hostId];
  if (host?.connected || (!immediate && host?.disconnectedAt !== null && host?.disconnectedAt !== undefined && now - host.disconnectedAt < RECONNECT_GRACE_MS)) return false;
  const next = migrateHost(room.players, room.hostId);
  if (!next) return false;
  room.hostId = next;
  return true;
}
