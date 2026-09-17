import { ChevronLeft, ChevronRight, Dice5 } from 'lucide-react';
import type { AvatarConfig } from '../../shared/game-types';
import { BODY_COLORS, randomAvatar } from '../lib/profile';
import { Avatar } from './Avatar';

const parts = [
  { key: 'accessory', label: 'Hair and headwear', names: ['No accessory', 'Headband', 'Spiky hair', 'Bandana'] },
  { key: 'eyes', label: 'Eyes', names: ['Dot eyes', 'Round glasses', 'Eyepatch', 'Cyber visor'] },
  { key: 'mouth', label: 'Mouth', names: ['Smile', 'Surprised', 'Big grin', 'Moustache'] },
] as const;

export function AvatarCustomizer({ value, onChange }: { value: AvatarConfig; onChange: (avatar: AvatarConfig) => void }) {
  const cycle = (key: 'eyes' | 'mouth' | 'accessory', direction: number) => onChange({ ...value, [key]: (value[key] + direction + 4) % 4 });
  return (
    <section className="avatar-customizer" aria-label="Customize your player">
      <div className="avatar-stage" data-testid="avatar-stage">
        <div className="avatar-arrows">
          {parts.map(({ key, label }) => <button key={key} type="button" className="avatar-arrow" aria-label={`Previous ${label.toLowerCase()}`} title={`Previous ${label.toLowerCase()}`} onClick={() => cycle(key, -1)}><ChevronLeft aria-hidden="true" /></button>)}
        </div>
        <div className="avatar-preview"><Avatar avatar={value} size={160} label="Your customized avatar" /></div>
        <div className="avatar-arrows">
          {parts.map(({ key, label }) => <button key={key} type="button" className="avatar-arrow" aria-label={`Next ${label.toLowerCase()}`} title={`Next ${label.toLowerCase()}`} onClick={() => cycle(key, 1)}><ChevronRight aria-hidden="true" /></button>)}
        </div>
      </div>
      <p className="avatar-selection" aria-live="polite">{parts.map(({ key, names }) => names[value[key] % 4]).join(' · ')}</p>
      <div className="avatar-options">
        <span className="field-label">Body color</span>
        <div className="swatches" role="group" aria-label="Avatar body color">
          {BODY_COLORS.map((color) => <button key={color} type="button" className={`swatch ${value.body === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => onChange({ ...value, body: color })} aria-label={`Use body color ${color}`} aria-pressed={value.body === color} />)}
        </div>
        <button type="button" className="small-button randomize" onClick={() => onChange(randomAvatar())}><Dice5 size={18} /> Randomize</button>
      </div>
    </section>
  );
}
