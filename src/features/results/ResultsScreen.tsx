import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import type { RoomView } from '../../../shared/game-types';
import type { ClientMessage } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';

export function ResultsScreen({ room, selfId, send }: { room: RoomView; selfId: string; send: (message: ClientMessage) => boolean }) {
  const sorted = [...room.players].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
  const medals = ['🥇', '🥈', '🥉'];
  const isHost = room.hostId === selfId;
  return (
    <main className="results-page room-page">
      <section className="results-card panel">
        <div className="trophy-burst"><Trophy size={44} /></div>
        <p className="eyebrow">That’s a wrap</p>
        <h1>Game over!</h1>
        <p>Sharp guesses, questionable art, excellent work.</p>
        <div className="podium">
          {[1, 0, 2].map((rank) => {
            const player = sorted[rank];
            if (!player) return <div key={rank} />;
            return <div key={player.id} className={`podium-place place-${rank + 1}`}><span className="medal">{medals[rank]}</span><Avatar avatar={player.avatar} size={rank === 0 ? 82 : 66} /><strong>{player.name}</strong><span>{player.score} pts</span><i>{rank + 1}</i></div>;
          })}
        </div>
        <ol className="final-list">
          {sorted.map((player, index) => <li key={player.id}><span>#{index + 1}</span><Avatar avatar={player.avatar} size={38} /><strong>{player.name}</strong><b>{player.score} pts</b></li>)}
        </ol>
        {isHost ? <div className="result-actions"><button className="primary-button" data-testid="play-again" onClick={() => send({ type: 'game:play-again' })}><RotateCcw size={18} /> Play again</button><button className="secondary-button" onClick={() => send({ type: 'game:back-to-lobby' })}><ArrowLeft size={18} /> Back to lobby</button></div> : <p className="waiting-host">Waiting for the host to choose what’s next…</p>}
      </section>
    </main>
  );
}
