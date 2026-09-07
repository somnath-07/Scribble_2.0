import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import type { AvatarConfig, PlayerProfile } from '../../../shared/game-types';
import { AvatarCustomizer } from '../../components/AvatarCustomizer';
import { GameLogo } from '../../components/GameLogo';
import { randomAvatar, saveProfile } from '../../lib/profile';

interface Props {
  existingProfile: PlayerProfile | null;
  onCreate: (profile: PlayerProfile) => Promise<void>;
  busy: boolean;
  error: string;
}

export function HomeScreen({ existingProfile, onCreate, busy, error }: Props) {
  const [name, setName] = useState(existingProfile?.name ?? '');
  const [avatar, setAvatar] = useState<AvatarConfig>(existingProfile?.avatar ?? randomAvatar());
  const valid = name.trim().length > 0 && name.trim().length <= 20;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    const profile = saveProfile(name, avatar, existingProfile?.id);
    await onCreate(profile);
  };

  return (
    <main className="home-page">
      <section className="home-shell">
        <header className="brand-lockup">
          <GameLogo />
          <p>Draw · Guess · Laugh</p>
        </header>
        <div className="home-grid">
          <form className="player-card" onSubmit={submit}>
            <div className="card-heading"><p className="eyebrow">Private room</p><h1>Pick your player</h1></div>
            <label htmlFor="player-name" className="field-label">Player name</label>
            <input id="player-name" data-testid="player-name" value={name} onChange={(event) => setName(event.target.value.slice(0, 20))} placeholder="What should friends call you?" autoComplete="nickname" maxLength={20} />
            <div className="character-count">{name.trim().length}/20</div>
            <AvatarCustomizer value={avatar} onChange={setAvatar} />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button create-button" data-testid="create-room" disabled={!valid || busy}>
              {busy ? 'Creating your room…' : 'Create private room'} <ArrowRight size={19} />
            </button>
            <p className="privacy-note"><LockKeyhole size={14} /> Only people with your link can join.</p>
          </form>
        </div>
      </section>
    </main>
  );
}
