import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { PrivateGameView, RoomView } from '../../../shared/game-types';
import type { ClientMessage } from '../../../shared/protocol';

export function DrawingReactions({ room, privateView, selfId, send }: { room: RoomView; privateView: PrivateGameView; selfId: string; send: (message: ClientMessage) => boolean }) {
  const ownDrawing = room.game.currentDrawerId === selfId;
  const selected = privateView.drawingReaction;
  const vote = (value: 'like' | 'dislike') => send({ type: 'drawing:react', payload: { turnNumber: room.game.turnNumber, vote: selected === value ? null : value } });
  return <div className="drawing-reactions" role="group" aria-label="Rate this drawing">
    <span>{ownDrawing ? 'Your drawing' : 'Rate this drawing'}</span>
    <button type="button" disabled={ownDrawing} aria-label="Like drawing" aria-pressed={selected === 'like'} onClick={() => vote('like')}><ThumbsUp size={17} /><b data-testid="drawing-likes">{room.game.drawingLikes ?? 0}</b></button>
    <button type="button" disabled={ownDrawing} aria-label="Dislike drawing" aria-pressed={selected === 'dislike'} onClick={() => vote('dislike')}><ThumbsDown size={17} /><b data-testid="drawing-dislikes">{room.game.drawingDislikes ?? 0}</b></button>
  </div>;
}
