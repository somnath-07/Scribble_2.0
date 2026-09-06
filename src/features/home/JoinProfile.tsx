import { useState } from 'react';
import type { AvatarConfig, PlayerProfile } from '../../../shared/game-types';
import { AvatarCustomizer } from '../../components/AvatarCustomizer';
import { randomAvatar, saveProfile } from '../../lib/profile';

export function JoinProfile({ roomId, onJoin }: { roomId: string; onJoin: (profile: PlayerProfile) => void }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarConfig>(randomAvatar());
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onJoin(saveProfile(name, avatar));
  };
  return (
    <main className="join-page">
      <form className="player-card join-card" onSubmit={submit}>
        <p className="eyebrow">You’re invited · Room {roomId}</p>
        <h1>Join the doodle party</h1>
        <label className="field-label" htmlFor="join-name">Enter your name</label>
        <input id="join-name" data-testid="join-name" autoFocus maxLength={20} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your player name" />
        <AvatarCustomizer value={avatar} onChange={setAvatar} />
        <button className="primary-button" data-testid="join-room" disabled={!name.trim()}>Join room</button>
      </form>
    </main>
  );
}
