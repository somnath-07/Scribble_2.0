import { Dice5 } from 'lucide-react';
import type { AvatarConfig } from '../../shared/game-types';
import { randomAvatar } from '../lib/profile';
import { Avatar } from './Avatar';

const bodyColors = ['#f6c7a8', '#c98b63', '#7c4a2d', '#fde68a', '#a7f3d0', '#bfdbfe', '#ddd6fe', '#fecdd3'];

export function AvatarCustomizer({ value, onChange }: { value: AvatarConfig; onChange: (avatar: AvatarConfig) => void }) {
  const cycle = (key: 'eyes' | 'mouth' | 'accessory') => onChange({ ...value, [key]: (value[key] + 1) % 4 });
  return (
    <section className="avatar-customizer" aria-labelledby="avatar-title">
      <div className="avatar-preview"><Avatar avatar={value} size={116} label="Your customized avatar" /></div>
      <div className="avatar-options">
        <div>
          <span id="avatar-title" className="field-label">Body color</span>
          <div className="swatches" role="group" aria-label="Avatar body color">
            {bodyColors.map((color) => <button key={color} type="button" className={`swatch ${value.body === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => onChange({ ...value, body: color })} aria-label={`Use body color ${color}`} />)}
          </div>
        </div>
        <div className="avatar-parts">
          <button type="button" className="small-button" onClick={() => cycle('eyes')}>Eyes</button>
          <button type="button" className="small-button" onClick={() => cycle('mouth')}>Mouth</button>
          <button type="button" className="small-button" onClick={() => cycle('accessory')}>Accessory</button>
          <button type="button" className="small-button randomize" onClick={() => onChange(randomAvatar())}><Dice5 size={16} /> Randomize</button>
        </div>
      </div>
    </section>
  );
}
