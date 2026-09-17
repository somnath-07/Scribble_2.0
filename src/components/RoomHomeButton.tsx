import { useEffect, useState } from 'react';
import type { ClientMessage } from '../../shared/protocol';
import { GameLogo } from './GameLogo';

export function RoomHomeButton({ send }: { send: (message: ClientMessage) => boolean }) {
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!leaving) return;
    const timeout = window.setTimeout(() => {
      setLeaving(false);
      setError('Could not confirm leaving. Check your connection and try again.');
    }, 10_000);
    return () => window.clearTimeout(timeout);
  }, [leaving]);
  const leave = () => {
    if (!window.confirm('Leave this room and go home? If you are the host, ownership passes to the next connected player.')) return;
    setError('');
    if (send({ type: 'room:leave' })) setLeaving(true);
    else setError('Reconnect before leaving so the room can confirm your departure.');
  };
  return <div className="room-home-control">
    <button type="button" className="room-home-button" aria-label="Leave room and go home" disabled={leaving} onClick={leave}><GameLogo compact /></button>
    {leaving && <span className="leave-notice" role="status">Leaving room…</span>}
    {error && <span className="leave-notice" role="alert">{error}</span>}
  </div>;
}
