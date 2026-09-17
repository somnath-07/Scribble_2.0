import { Clock3, Crown, Eye, PencilLine, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PrivateGameView, RoomView } from '../../../shared/game-types';
import type { ClientMessage } from '../../../shared/protocol';
import { RoomHomeButton } from '../../components/RoomHomeButton';
import { DrawingReactions } from './DrawingReactions';
import { CanvasBoard } from '../canvas/CanvasBoard';
import { DrawingTools } from '../canvas/DrawingTools';
import { ChatPanel } from '../chat/ChatPanel';
import { PlayerList } from '../players/PlayerList';

interface Props {
  room: RoomView;
  privateView: PrivateGameView;
  selfId: string;
  send: (message: ClientMessage) => boolean;
  muted: boolean;
  onToggleSound: () => void;
  mutedPlayers: Set<string>;
  onMutePlayer: (id: string) => void;
}

function useCountdown(endsAt: number | null, serverTime: number): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const receivedAt = performance.now();
    const update = () => setRemaining(endsAt ? Math.max(0, Math.ceil((endsAt - serverTime - (performance.now() - receivedAt)) / 1_000)) : 0);
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [endsAt, serverTime]);
  return remaining;
}

export function GameScreen({ room, privateView, selfId, send, muted, onToggleSound, mutedPlayers, onMutePlayer }: Props) {
  const [tool, setTool] = useState<'brush' | 'eraser' | 'fill'>('brush');
  const [color, setColor] = useState('#111827');
  const [size, setSize] = useState(10);
  const remaining = useCountdown(room.game.phaseEndsAt, room.serverTime);
  const isDrawer = room.game.currentDrawerId === selfId;
  const canDraw = isDrawer && room.game.phase === 'DRAWING';
  const self = room.players.find((player) => player.id === selfId);
  const drawer = room.players.find((player) => player.id === room.game.currentDrawerId);
  const displayWord = isDrawer ? (privateView.selectedWord?.toLocaleUpperCase('en') ?? 'CHOOSING…') : room.game.maskedWord;

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches('input, textarea, select') || !canDraw) return;
      if (event.key.toLowerCase() === 'b') setTool('brush');
      if (event.key.toLowerCase() === 'e') setTool('eraser');
      if (event.key.toLowerCase() === 'f') setTool('fill');
      if (event.key.toLowerCase() === 'u') send({ type: 'draw:undo' });
      const numeric = Number(event.key);
      if (numeric >= 1 && numeric <= 5) setSize([2, 5, 10, 20, 40][numeric - 1]);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [canDraw, send]);

  return (
    <main className="game-page room-page">
      <div className="game-brandline"><RoomHomeButton send={send} /></div>
      <header className="game-topbar">
        <div className="round-label"><span>Round</span><strong>{room.game.currentRound} <small>of {room.game.totalRounds}</small></strong></div>
        <div className={`timer ${remaining <= 10 && room.game.phase === 'DRAWING' ? 'urgent' : ''}`}><Clock3 /><strong>{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</strong></div>
        <div className="word-display"><span>{isDrawer ? 'Your word' : room.game.phase === 'WORD_SELECTION' ? `${drawer?.name ?? 'Drawer'} is choosing…` : 'Guess the word'}</span><strong data-testid="word-display">{displayWord || '—'}</strong></div>
        <button className="icon-button sound-button" onClick={onToggleSound} aria-label={muted ? 'Turn sound on' : 'Mute sound'}>{muted ? <VolumeX /> : <Volume2 />}</button>
      </header>
      <div className="game-layout">
        <aside className="panel leaderboard-panel">
          <div className="panel-title compact"><div><p className="eyebrow">Scoreboard</p><h2>Players</h2></div>{room.hostId === selfId && <Crown className="crown" />}</div>
          <PlayerList players={room.players} hostId={room.hostId} selfId={selfId} currentDrawerId={room.game.currentDrawerId} isHost={room.hostId === selfId} mutedPlayers={mutedPlayers} onMute={onMutePlayer} />
        </aside>
        <section className="canvas-column">
          <CanvasBoard commands={room.game.canvasCommands} active={canDraw} tool={tool} color={color} size={size} onStroke={(stroke) => send({ type: 'draw:stroke', payload: stroke })} onFill={(fill) => send({ type: 'draw:fill', payload: fill })} />
          <DrawingTools tool={tool} color={color} size={size} disabled={!canDraw} onTool={setTool} onColor={setColor} onSize={setSize} onUndo={() => send({ type: 'draw:undo' })} onClear={() => { if (window.confirm('Clear drawing?')) send({ type: 'draw:clear' }); }} />
          {room.game.phase === 'DRAWING' && <DrawingReactions room={room} privateView={privateView} selfId={selfId} send={send} />}
        </section>
        <ChatPanel messages={room.chat} selfId={selfId} mutedPlayers={mutedPlayers} disabled={isDrawer || room.game.phase !== 'DRAWING'} solved={Boolean(self?.hasGuessed)} onSend={(text) => send({ type: 'chat:message', payload: { text } })} />
      </div>
      {room.game.phase === 'WORD_SELECTION' && <div className="phase-overlay" data-testid="word-selection"><div className="phase-card panel">{isDrawer ? <><p className="eyebrow">You’re up!</p><h2>Choose a word</h2><p>Pick one before the timer runs out.</p><div className="word-choices">{privateView.wordChoices?.map((word) => <button key={word} data-testid="word-choice" onClick={() => send({ type: 'word:select', payload: { word } })}>{word}</button>)}</div></> : <><div className="choosing-pencil"><PencilLine /></div><p className="eyebrow">Next artist</p><h2>{drawer?.name ?? 'Someone'} is choosing a word…</h2><p>The canvas will open in a moment.</p></>}</div></div>}
      {room.game.phase === 'TURN_RESULTS' && <div className="phase-overlay"><div className="phase-card panel"><p className="eyebrow">Time’s up</p><h2>The word was</h2><div className="revealed-word">{room.game.lastWord}</div><DrawingReactions room={room} privateView={privateView} selfId={selfId} send={send} /><p>Next turn starts soon…</p></div></div>}
      {self?.spectator && <div className="spectator-pill"><Eye size={16} /> You joined mid-game and are spectating until the next game.</div>}
    </main>
  );
}
