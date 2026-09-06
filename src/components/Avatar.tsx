import type { AvatarConfig } from '../../shared/game-types';

interface AvatarProps {
  avatar: AvatarConfig;
  size?: number;
  label?: string;
}

export function Avatar({ avatar, size = 64, label = 'Player avatar' }: AvatarProps) {
  const eyeVariants = [
    <><circle cx="36" cy="44" r="4" /><circle cx="64" cy="44" r="4" /></>,
    <><path d="M30 44q6-8 12 0" /><path d="M58 44q6-8 12 0" /></>,
    <><circle cx="36" cy="44" r="6" fill="white" /><circle cx="36" cy="44" r="2" /><circle cx="64" cy="44" r="6" fill="white" /><circle cx="64" cy="44" r="2" /></>,
    <><path d="M30 39l12 9M42 39l-12 9M58 39l12 9M70 39l-12 9" /></>,
  ];
  const mouths = [
    <path d="M39 64q11 10 22 0" />,
    <path d="M39 68q11-10 22 0" />,
    <circle cx="50" cy="66" r="7" />,
    <path d="M40 66h20" />,
  ];
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label}>
      <circle cx="50" cy="53" r="39" fill={avatar.body} stroke="#1f2852" strokeWidth="4" />
      <g fill="#1f2852" stroke="#1f2852" strokeWidth="4" strokeLinecap="round">{eyeVariants[avatar.eyes % eyeVariants.length]}</g>
      <g fill="none" stroke="#1f2852" strokeWidth="4" strokeLinecap="round">{mouths[avatar.mouth % mouths.length]}</g>
      {avatar.accessory % 4 === 1 && <path d="M20 28q30-27 60 0l-6 7H26z" fill="#ff5c5c" stroke="#1f2852" strokeWidth="4" />}
      {avatar.accessory % 4 === 2 && <path d="M21 23h58l-8 13H29z" fill="#ffd84d" stroke="#1f2852" strokeWidth="4" />}
      {avatar.accessory % 4 === 3 && <><path d="M18 45h28M54 45h28M46 45h8" stroke="#1f2852" strokeWidth="4" /><circle cx="34" cy="45" r="12" fill="none" stroke="#1f2852" strokeWidth="4" /><circle cx="66" cy="45" r="12" fill="none" stroke="#1f2852" strokeWidth="4" /></>}
    </svg>
  );
}
