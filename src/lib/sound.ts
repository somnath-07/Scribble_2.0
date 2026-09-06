export type GameSound = 'warning' | 'correct' | 'turn' | 'game-end';

const notes: Record<GameSound, number[]> = {
  warning: [440],
  correct: [523, 659, 784],
  turn: [392, 523],
  'game-end': [523, 659, 784, 1047],
};

export function playSound(sound: GameSound): void {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const start = context.currentTime;
  notes[sound].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + index * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.12, start + index * 0.1 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.1 + 0.12);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start + index * 0.1);
    oscillator.stop(start + index * 0.1 + 0.14);
  });
  window.setTimeout(() => void context.close(), 1_000);
}
