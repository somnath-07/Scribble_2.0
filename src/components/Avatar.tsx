import type { CSSProperties } from 'react';
import type { AvatarConfig } from '../../shared/game-types';

const eyes = ['dots', 'glasses', 'patch', 'visor'];
const mouths = ['smile', 'open', 'grin', 'moustache'];
const accessories = [null, 'headband', 'hair', 'bandana'];

export function Avatar({ avatar, size = 64, label = 'Player avatar' }: { avatar: AvatarConfig; size?: number; label?: string }) {
  const accessory = accessories[avatar.accessory % accessories.length];
  return (
    <span className="avatar pixel-avatar" style={{ width: size, height: size, '--avatar-color': avatar.body } as CSSProperties} role="img" aria-label={label} data-body={avatar.body}>
      <span className="avatar-body" />
      <img src="/avatars/base-outline.png" alt="" draggable={false} />
      <img src={`/avatars/eyes-${eyes[avatar.eyes % eyes.length]}.png`} alt="" draggable={false} />
      <img src={`/avatars/mouth-${mouths[avatar.mouth % mouths.length]}.png`} alt="" draggable={false} />
      {accessory && <img src={`/avatars/accessory-${accessory}.png`} alt="" draggable={false} />}
    </span>
  );
}
