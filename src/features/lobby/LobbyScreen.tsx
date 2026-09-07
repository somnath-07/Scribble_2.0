import { Check, Clipboard, Crown, LockKeyhole, PencilLine, Play, Settings2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DRAW_TIMES } from '../../../shared/constants';
import type { RoomSettings, RoomView } from '../../../shared/game-types';
import type { ClientMessage } from '../../../shared/protocol';
import { GameLogo } from '../../components/GameLogo';
import { PlayerList } from '../players/PlayerList';

interface Props {
  room: RoomView;
  selfId: string;
  send: (message: ClientMessage) => boolean;
  mutedPlayers: Set<string>;
  onMute: (id: string) => void;
}

export function LobbyScreen({ room, selfId, send, mutedPlayers, onMute }: Props) {
  const isHost = room.hostId === selfId;
  const [copied, setCopied] = useState(false);
  const [customWords, setCustomWords] = useState(room.settings.customWords.join(', '));
  const inviteUrl = `${window.location.origin}/room/${room.roomId}`;
  useEffect(() => setCustomWords(room.settings.customWords.join(', ')), [room.settings.customWords]);

  const update = (patch: Partial<RoomSettings>) => send({ type: 'room:update-settings', payload: { ...room.settings, ...patch } });
  const parseCustom = () => update({ customWords: customWords.split(/[\n,]/).map((word) => word.trim()).filter(Boolean) });
  const copy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  };
  const connectedPlayers = room.players.filter((player) => player.connected).length;

  return (
    <main className="room-page lobby-page">
      <header className="room-header">
        <GameLogo compact />
        <div className="room-code"><LockKeyhole size={15} /> Private room <strong>{room.roomId}</strong></div>
      </header>
      <div className="lobby-grid">
        <section className="panel settings-panel">
          <div className="panel-title"><div><p className="eyebrow">Host controls</p><h1><Settings2 /> Game settings</h1></div>{isHost && <span className="host-chip"><Crown size={14} /> You’re host</span>}</div>
          {!isHost && <div className="waiting-banner">The host is setting things up. Changes appear here live.</div>}
          <div className="settings-grid">
            <Setting label="Player limit"><select aria-label="Player limit" disabled={!isHost} value={room.settings.playerLimit} onChange={(event) => update({ playerLimit: Number(event.target.value) })}>{Array.from({ length: 19 }, (_, index) => index + 2).map((value) => <option key={value}>{value}</option>)}</select></Setting>
            <Setting label="Draw time"><select aria-label="Draw time" disabled={!isHost} value={room.settings.drawTime} onChange={(event) => update({ drawTime: Number(event.target.value) })}>{DRAW_TIMES.map((value) => <option key={value} value={value}>{value} sec</option>)}</select></Setting>
            <Setting label="Rounds"><select aria-label="Rounds" disabled={!isHost} value={room.settings.rounds} onChange={(event) => update({ rounds: Number(event.target.value) })}>{Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <option key={value}>{value}</option>)}</select></Setting>
            <Setting label="Word choices"><select aria-label="Word choices" disabled={!isHost} value={room.settings.wordChoices} onChange={(event) => update({ wordChoices: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></Setting>
            <Setting label="Hints"><select aria-label="Hints" disabled={!isHost} value={room.settings.hints} onChange={(event) => update({ hints: Number(event.target.value) })}>{[0, 1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></Setting>
            <Setting label="Language"><select aria-label="Language" disabled><option>English</option></select></Setting>
          </div>
          <fieldset className="word-mode" disabled={!isHost}>
            <legend className="field-label">Word mode</legend>
            {(['NORMAL', 'HIDDEN', 'COMBINATION'] as const).map((mode) => <label key={mode} className={room.settings.wordMode === mode ? 'selected' : ''}><input type="radio" name="word-mode" checked={room.settings.wordMode === mode} onChange={() => update({ wordMode: mode })} /><strong>{mode[0]}{mode.slice(1).toLowerCase()}</strong><small>{mode === 'NORMAL' ? 'Classic word-length clues' : mode === 'HIDDEN' ? 'No letter or length clues' : 'Multi-word prompts'}</small></label>)}
          </fieldset>
          <label className="field-label" htmlFor="custom-words">Custom words</label>
          <textarea id="custom-words" disabled={!isHost} value={customWords} onChange={(event) => setCustomWords(event.target.value)} onBlur={parseCustom} placeholder="figma, banana, spaceship, coffee mug" rows={3} />
          <label className="check-row"><input type="checkbox" disabled={!isHost} checked={room.settings.customWordsOnly} onChange={(event) => update({ customWordsOnly: event.target.checked })} /> Use custom words only</label>
        </section>
        <aside className="panel lobby-players">
          <div className="panel-title"><div><p className="eyebrow">Lobby</p><h2><Users /> Players</h2></div><span className="count-chip">{connectedPlayers}/{room.settings.playerLimit}</span></div>
          <PlayerList players={room.players} hostId={room.hostId} selfId={selfId} isHost={isHost} mutedPlayers={mutedPlayers} onMute={onMute} onKick={(playerId) => send({ type: 'player:kick', payload: { playerId } })} />
          {connectedPlayers < 2 && <div className="waiting-illustration"><div className="orbit"><PencilLine /></div><strong>Waiting for one more friend</strong><small>Share the invite below to get started.</small></div>}
        </aside>
      </div>
      <footer className="invite-bar">
        <div className="invite-copy"><p className="eyebrow">Invite your friends</p><strong>{inviteUrl}</strong></div>
        <button className="secondary-button" onClick={copy}>{copied ? <Check size={18} /> : <Clipboard size={18} />} {copied ? 'Copied!' : 'Copy link'}</button>
        {isHost ? <button className="primary-button start-button" data-testid="start-game" disabled={connectedPlayers < 2} onClick={() => send({ type: 'game:start' })}><Play size={19} fill="currentColor" /> Start game</button> : <div className="waiting-host">Waiting for host…</div>}
      </footer>
    </main>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="field-label">{label}</span>{children}</label>;
}
