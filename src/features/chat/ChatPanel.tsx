import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../../shared/game-types';

interface Props {
  messages: ChatMessage[];
  selfId: string;
  mutedPlayers: Set<string>;
  disabled: boolean;
  solved: boolean;
  onSend: (text: string) => void;
}

export function ChatPanel({ messages, selfId, mutedPlayers, disabled, solved, onSend }: Props) {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText('');
  };
  return (
    <section className="chat-panel panel">
      <div className="chat-heading"><div><p className="eyebrow">Live</p><h2>Guesses & chat</h2></div><span className="live-dot">●</span></div>
      <div className="chat-log" role="log" aria-live="polite">
        {messages.filter((message) => !message.playerId || !mutedPlayers.has(message.playerId)).map((message) => (
          <div key={message.id} className={`chat-message ${message.kind}`} data-testid={message.kind === 'correct' ? 'correct-guess' : undefined}>
            {message.kind === 'chat' && <strong>{message.playerId === selfId ? 'You' : message.playerName}</strong>}
            <span>{message.text}</span>
          </div>
        ))}
        {!messages.length && <div className="empty-chat">Guesses will appear here. Be the first!</div>}
        <div ref={endRef} />
      </div>
      <form className="chat-input" onSubmit={submit}>
        <input aria-label="Type your guess" data-testid="guess-input" placeholder={disabled ? 'Watch the drawing…' : solved ? 'Chat with players who solved it…' : 'Type your guess here…'} disabled={disabled} maxLength={120} value={text} onChange={(event) => setText(event.target.value)} />
        <button aria-label="Send guess" disabled={disabled || !text.trim()}><Send size={18} /></button>
      </form>
    </section>
  );
}
