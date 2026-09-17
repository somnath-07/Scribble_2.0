import { LoaderCircle, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlayerProfile } from '../shared/game-types';
import { GameScreen } from './features/game/GameScreen';
import { HomeScreen } from './features/home/HomeScreen';
import { JoinProfile } from './features/home/JoinProfile';
import { LobbyScreen } from './features/lobby/LobbyScreen';
import { ResultsScreen } from './features/results/ResultsScreen';
import { useRoomSocket } from './hooks/useRoomSocket';
import { loadProfile, saveProfile } from './lib/profile';

declare global {
  interface Document {
    modelContext?: {
      registerTool(tool: {
        name: string;
        title: string;
        description: string;
        inputSchema: object;
        annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
        execute(input: unknown): Promise<unknown>;
      }, options?: { signal?: AbortSignal }): void | Promise<void>;
    };
  }
}

function currentRoomId(): string | null {
  const match = window.location.pathname.match(/^\/room\/([A-Z0-9]+)\/?$/i);
  return match ? match[1].toUpperCase() : null;
}

async function requestRoom(profile: PlayerProfile): Promise<string> {
  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error('We could not create the room. Please try again.');
  const data = await response.json() as { roomId?: string };
  if (!data.roomId) throw new Error('The room link was missing. Please try again.');
  return data.roomId;
}

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(currentRoomId);
  const [profile, setProfile] = useState<PlayerProfile | null>(loadProfile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const popstate = () => setRoomId(currentRoomId());
    window.addEventListener('popstate', popstate);
    return () => window.removeEventListener('popstate', popstate);
  }, []);

  const create = useCallback(async (nextProfile: PlayerProfile) => {
    setBusy(true);
    setError('');
    try {
      const nextRoomId = await requestRoom(nextProfile);
      setProfile(nextProfile);
      window.history.pushState({}, '', `/room/${nextRoomId}`);
      setRoomId(nextRoomId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the room.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (roomId || !document.modelContext?.registerTool) return;
    const controller = new AbortController();
    void Promise.resolve(document.modelContext.registerTool({
      name: 'create_private_room',
      title: 'Create a private drawing room',
      description: 'Create a shareable private Scribble 2 room for the named player and navigate to it.',
      inputSchema: { type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 20 } }, required: ['name'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        if (!input || typeof input !== 'object' || !('name' in input) || typeof input.name !== 'string' || !input.name.trim()) throw new Error('A player name is required.');
        const nextProfile = saveProfile(input.name, profile?.avatar ?? { body: '#bfdbfe', eyes: 0, mouth: 0, accessory: 0 }, profile?.id);
        await create(nextProfile);
        return { roomId: currentRoomId(), path: window.location.pathname };
      },
    }, { signal: controller.signal })).catch(() => undefined);
    return () => controller.abort();
  }, [create, profile, roomId]);

  if (!roomId) return <HomeScreen existingProfile={profile} onCreate={create} busy={busy} error={error} />;
  if (!profile) return <JoinProfile roomId={roomId} onJoin={setProfile} />;
  return <RoomExperience roomId={roomId} profile={profile} />;
}

function RoomExperience({ roomId, profile }: { roomId: string; profile: PlayerProfile }) {
  const [muted, setMuted] = useState(() => localStorage.getItem('scribble2:muted') === 'true');
  const [mutedPlayers, setMutedPlayers] = useState<Set<string>>(() => new Set());
  const stableProfile = useMemo(() => profile, [profile]);
  const { room, privateView, status, notice, send, retry } = useRoomSocket(roomId, stableProfile, muted);
  const toggleSound = () => setMuted((current) => {
    localStorage.setItem('scribble2:muted', String(!current));
    return !current;
  });
  const toggleMutePlayer = (id: string) => setMutedPlayers((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  if (!room || status === 'lost' || status === 'kicked' || status === 'replaced') {
    const terminal = status === 'lost' || status === 'kicked' || status === 'replaced';
    return <main className="connection-page"><div className="connection-card panel">{terminal ? <WifiOff size={38} /> : <LoaderCircle className="spin" size={38} />}<h1>{status === 'kicked' ? 'You were removed' : status === 'replaced' ? 'Playing in another tab' : status === 'lost' ? 'Room unavailable' : 'Joining the room…'}</h1><p role="status">{notice}</p>{status === 'replaced' && <button className="primary-button" onClick={retry}>Continue in this tab</button>}{terminal && <a className="secondary-button" href="/">Go home</a>}</div></main>;
  }

  return (
    <>
      {room.game.phase === 'WAITING' && <LobbyScreen room={room} selfId={profile.id} send={send} mutedPlayers={mutedPlayers} onMute={toggleMutePlayer} />}
      {(room.game.phase === 'WORD_SELECTION' || room.game.phase === 'DRAWING' || room.game.phase === 'TURN_RESULTS') && <GameScreen room={room} privateView={privateView} selfId={profile.id} send={send} muted={muted} onToggleSound={toggleSound} mutedPlayers={mutedPlayers} onMutePlayer={toggleMutePlayer} />}
      {room.game.phase === 'GAME_RESULTS' && <ResultsScreen room={room} selfId={profile.id} send={send} />}
      {status !== 'connected' && <div className="connection-toast" role="status"><LoaderCircle className="spin" size={16} /> {notice}</div>}
    </>
  );
}
