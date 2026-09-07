import { Crown, MicOff, Pencil, UserRoundX, WifiOff } from 'lucide-react';
import type { Player } from '../../../shared/game-types';
import { Avatar } from '../../components/Avatar';

interface Props {
  players: Player[];
  hostId: string;
  selfId: string;
  currentDrawerId?: string | null;
  isHost: boolean;
  mutedPlayers: Set<string>;
  onKick?: (id: string) => void;
  onMute?: (id: string) => void;
  onCustomizeSelf?: () => void;
}

export function PlayerList({ players, hostId, selfId, currentDrawerId, isHost, mutedPlayers, onKick, onMute, onCustomizeSelf }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
  return (
    <ol className="player-list" aria-label="Players">
      {sorted.map((player, index) => (
        <li key={player.id} className={`player-row ${player.id === currentDrawerId ? 'drawing' : ''} ${player.hasGuessed ? 'guessed' : ''} ${!player.connected ? 'offline' : ''}`} data-testid={`player-${player.name}`}>
          <span className="rank">#{index + 1}</span>
          {player.id === selfId && onCustomizeSelf ? (
            <button className="player-avatar-button" type="button" aria-label="Customize your avatar" onClick={onCustomizeSelf}>
              <Avatar avatar={player.avatar} size={44} label={`${player.name}'s avatar`} />
              <span><Pencil size={11} /></span>
            </button>
          ) : <Avatar avatar={player.avatar} size={44} label={`${player.name}'s avatar`} />}
          <span className="player-meta">
            <strong>{player.name}{player.id === selfId ? ' (you)' : ''}</strong>
            <small>{player.spectator ? 'Spectating' : player.id === currentDrawerId ? 'Drawing now' : player.hasGuessed ? 'Guessed it!' : player.connected ? 'Ready' : 'Reconnecting'}</small>
          </span>
          {player.id === hostId && <Crown className="crown" size={18} aria-label="Host" />}
          {!player.connected && <WifiOff size={17} aria-label="Disconnected" />}
          <strong className="score">{player.score}</strong>
          {player.id !== selfId && (isHost ? (
            <button className="icon-button danger" aria-label={`Kick ${player.name}`} title={`Kick ${player.name}`} onClick={() => onKick?.(player.id)}><UserRoundX size={16} /></button>
          ) : (
            <button className={`icon-button ${mutedPlayers.has(player.id) ? 'active' : ''}`} aria-label={`${mutedPlayers.has(player.id) ? 'Unmute' : 'Mute'} ${player.name}`} onClick={() => onMute?.(player.id)}><MicOff size={16} /></button>
          ))}
        </li>
      ))}
    </ol>
  );
}
