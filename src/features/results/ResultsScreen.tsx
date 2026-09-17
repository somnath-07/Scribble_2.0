import { ArrowLeft, Crown, RotateCcw, Trophy } from 'lucide-react';
import type { RoomView } from '../../../shared/game-types';
import type { ClientMessage } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { RoomHomeButton } from '../../components/RoomHomeButton';
import { rankedPlayers } from '../../../shared/rankings';

export function ResultsScreen({ room, selfId, send }: { room: RoomView; selfId: string; send: (message: ClientMessage) => boolean }) {
  const sorted = rankedPlayers(room);
  const isHost = room.hostId === selfId;
  const winner = sorted[0];
  const canReplay = room.players.filter((player) => player.connected).length >= 2;
  return (
    <main className="results-page room-page">
      <div className="results-brandline"><RoomHomeButton send={send} /></div>
      <section className="results-card panel">
        <div className="trophy-burst"><Trophy size={44} /></div>
        <p className="eyebrow">That’s a wrap</p>
        <h1>Game over!</h1>
        <p className="winner-announcement" data-testid="winner-announcement">{winner ? <><strong>{winner.name}</strong> wins{room.game.winnerId ? ' as the last remaining player' : ' the game'}!</> : 'Thanks for playing!'}</p>
        <p className="results-subtitle">A round of applause for our artists.</p>
        <div className={`podium podium-count-${Math.min(sorted.length, 3)}`} aria-label="Top three players">
          {[1, 0, 2].map((rank) => {
            const player = sorted[rank];
            if (!player) return null;
            return <div key={player.id} className={`podium-place place-${rank + 1}`} data-testid={`podium-rank-${rank + 1}`}>
              <div className="podium-player">{rank === 0 && <Crown className="winner-crown" size={30} aria-label="Winner" />}<Avatar avatar={player.avatar} size={rank === 0 ? 92 : 76} label={`${player.name}'s avatar`} /><strong title={player.name}>{player.name}{player.id === selfId && <small> (you)</small>}</strong></div>
              <div className="podium-step"><span className="podium-rank">{rank + 1}</span><b><span data-testid={player.id === selfId ? 'self-score' : undefined}>{player.score}</span> <small>pts</small></b><span className="podium-title">{['Champion', 'Runner-up', 'Third place'][rank]}</span></div>
            </div>;
          })}
        </div>
        {sorted.length > 3 && <section className="remaining-rankings" aria-label="Remaining rankings"><h2>The rest of the artists</h2><ol className="final-list" start={4}>
          {sorted.slice(3).map((player, index) => <li key={player.id}><span>#{index + 4}</span><Avatar avatar={player.avatar} size={38} /><strong>{player.name}{player.id === selfId ? ' (you)' : ''}</strong><b><span data-testid={player.id === selfId ? 'self-score' : undefined}>{player.score}</span> pts</b></li>)}
        </ol></section>}
        {isHost ? <><div className="result-actions"><button className="primary-button" data-testid="play-again" disabled={!canReplay} onClick={() => send({ type: 'game:play-again' })}><RotateCcw size={18} /> Play again</button><button className="secondary-button" onClick={() => send({ type: 'game:back-to-lobby' })}><ArrowLeft size={18} /> Back to lobby</button></div>{!canReplay && <p className="replay-help">Invite another player from the lobby to play again.</p>}</> : <p className="waiting-host">Waiting for the host to choose what’s next…</p>}
      </section>
    </main>
  );
}
