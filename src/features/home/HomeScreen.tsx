import { ArrowRight, LockKeyhole, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';
import type { AvatarConfig, PlayerProfile } from '../../../shared/game-types';
import { AvatarCustomizer } from '../../components/AvatarCustomizer';
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
      <div className="doodle doodle-one" aria-hidden="true">✦</div>
      <div className="doodle doodle-two" aria-hidden="true">⌁</div>
      <section className="home-shell">
        <header className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div>
            <p className="eyebrow">Draw. Guess. Laugh.</p>
            <h1>Scribble <em>2</em></h1>
          </div>
        </header>
        <div className="home-grid">
          <div className="welcome-copy">
            <div className="sticker"><Sparkles size={18} /> No account needed</div>
            <h2>Your next game night starts with a blank canvas.</h2>
            <p>Create a private room, send one link, and start drawing together in real time.</p>
            <ul className="feature-list">
              <li><LockKeyhole /> Private room link</li>
              <li><Users /> Up to 20 friends</li>
              <li><Sparkles /> Completely free to play</li>
            </ul>
          </div>
          <form className="player-card" onSubmit={submit}>
            <div className="card-heading">
              <span className="step-dot">1</span>
              <div><p className="eyebrow">Meet your doodler</p><h2>Pick your player</h2></div>
            </div>
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
