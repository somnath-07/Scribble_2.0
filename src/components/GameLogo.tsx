import { Pencil } from 'lucide-react';

const letters = [
  ['s', 'red'],
  ['c', 'orange'],
  ['r', 'yellow'],
  ['i', 'green'],
  ['b', 'cyan'],
  ['b', 'blue'],
  ['l', 'purple'],
  ['e', 'pink'],
] as const;

export function GameLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`game-logo ${compact ? 'compact' : ''}`} role="img" aria-label="Scribble 2">
      <span className="game-logo__word" aria-hidden="true">
        {letters.map(([letter, color], index) => <span className={`logo-${color}`} key={`${letter}-${index}`}>{letter}</span>)}
        <span className="logo-dot">.</span>
        <span className="logo-two">2</span>
      </span>
      <Pencil className="game-logo__pencil" aria-hidden="true" />
    </div>
  );
}
