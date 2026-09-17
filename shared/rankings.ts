import type { RoomView } from './game-types';

export function rankedPlayers(room: RoomView) {
  return room.players.filter((player) => room.game.drawingOrder.includes(player.id))
    .sort((a, b) => Number(b.id === room.game.winnerId) - Number(a.id === room.game.winnerId)
      || b.score - a.score || a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
}
