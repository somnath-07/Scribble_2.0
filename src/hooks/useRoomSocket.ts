import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasCommand, PlayerProfile, PrivateGameView, RoomView } from '../../shared/game-types';
import type { ClientMessage, ServerMessage } from '../../shared/protocol';
import { playSound } from '../lib/sound';
import { loadProfile } from '../lib/profile';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'lost' | 'kicked' | 'replaced';

function mergeCommand(commands: CanvasCommand[], command: CanvasCommand): CanvasCommand[] {
  if (command.kind !== 'stroke') return [...commands, command];
  const last = commands.at(-1);
  if (last?.kind === 'stroke' && last.strokeId === command.strokeId && last.tool === command.tool && last.color === command.color && last.size === command.size) {
    const cloned = commands.slice(0, -1);
    const previousPoint = last.points.at(-1);
    const offset = previousPoint && command.points[0]?.x === previousPoint.x && command.points[0]?.y === previousPoint.y ? 1 : 0;
    cloned.push({ ...last, points: [...last.points, ...command.points.slice(offset)] });
    return cloned;
  }
  return [...commands, { ...command, points: [...command.points] }];
}

export function useRoomSocket(roomId: string, profile: PlayerProfile, muted: boolean) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [privateView, setPrivateView] = useState<PrivateGameView>({});
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [notice, setNotice] = useState<string>('Connecting to room…');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const stoppedRef = useRef(false);
  const joinedRef = useRef(false);
  const retryRef = useRef<() => void>(() => undefined);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const updateCommands = useCallback((updater: (commands: CanvasCommand[]) => CanvasCommand[]) => {
    setRoom((current) => current ? { ...current, game: { ...current.game, canvasCommands: updater(current.game.canvasCommands) } } : current);
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    joinedRef.current = false;
    attemptRef.current = 0;
    setRoom(null);
    setPrivateView({});
    let disposed = false;
    let generation = 0;
    let connecting = false;
    let lastMessageAt = Date.now();
    let pendingPingAt: number | null = null;
    let watchdog: number | undefined;
    let probe: AbortController | undefined;

    const clearTimers = () => {
      if (reconnectTimerRef.current !== null) window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      window.clearTimeout(watchdog);
    };
    const terminal = (nextStatus: ConnectionStatus, text: string) => {
      stoppedRef.current = true;
      joinedRef.current = false;
      connecting = false;
      clearTimers();
      setStatus(nextStatus);
      setNotice(text);
    };
    const scheduleReconnect = () => {
      if (disposed || stoppedRef.current) return;
      clearTimers();
      connecting = false;
      joinedRef.current = false;
      attemptRef.current += 1;
      setStatus('reconnecting');
      setNotice(navigator.onLine ? 'Reconnecting… Your score is saved.' : 'You’re offline. Your score is saved; we’ll reconnect when you’re back.');
      const delay = Math.min(10_000, 750 * 2 ** Math.min(attemptRef.current - 1, 4));
      reconnectTimerRef.current = window.setTimeout(() => void connect(), delay);
    };
    const connect = async () => {
      if (stoppedRef.current) return;
      const currentGeneration = ++generation;
      clearTimers();
      probe?.abort();
      connecting = true;
      joinedRef.current = false;
      const oldSocket = socketRef.current;
      socketRef.current = null;
      oldSocket?.close(1000, 'Reconnecting');
      pendingPingAt = null;
      setStatus(attemptRef.current > 0 ? 'reconnecting' : 'connecting');
      setNotice(attemptRef.current > 0 ? 'Reconnecting… Your score is saved.' : 'Connecting to room…');
      probe = new AbortController();
      const probeTimeout = window.setTimeout(() => probe?.abort(), 10_000);
      try {
        const response = await fetch(`/api/rooms/${roomId}`, { cache: 'no-store', signal: probe.signal });
        if (disposed || currentGeneration !== generation) return;
        if (response.status === 404 || response.status === 400) {
          terminal('lost', 'Room not found or expired. Empty rooms stay available for 10 minutes.');
          return;
        }
        if (!response.ok) throw new Error('Room unavailable');
      } catch {
        if (!disposed && currentGeneration === generation) scheduleReconnect();
        return;
      } finally {
        window.clearTimeout(probeTimeout);
      }
      if (disposed || currentGeneration !== generation) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/api/rooms/${roomId}/ws`);
      socketRef.current = socket;
      const current = () => !disposed && !stoppedRef.current && socketRef.current === socket;
      const restart = () => {
        if (!current()) return;
        socketRef.current = null;
        socket.close(1000, 'Retry connection');
        scheduleReconnect();
      };
      watchdog = window.setTimeout(restart, 12_000);

      socket.addEventListener('open', () => {
        if (!current()) return;
        const saved = loadProfile();
        const identity = saved?.id === profileRef.current.id ? saved : profileRef.current;
        socket.send(JSON.stringify({ type: 'room:join', payload: identity } satisfies ClientMessage));
      });

      socket.addEventListener('message', (event) => {
        if (!current()) return;
        lastMessageAt = Date.now();
        pendingPingAt = null;
        if (event.data === 'pong') return;
        let message: ServerMessage;
        try { message = JSON.parse(String(event.data)) as ServerMessage; } catch { return; }
        switch (message.type) {
          case 'room:left':
            stoppedRef.current = true;
            joinedRef.current = false;
            clearTimers();
            socket.close(1000, 'Left room');
            window.location.assign('/');
            break;
          case 'room:state':
            window.clearTimeout(watchdog);
            connecting = false;
            joinedRef.current = true;
            attemptRef.current = 0;
            setStatus('connected');
            setNotice('Connected');
            setRoom(message.payload.room);
            setPrivateView(message.payload.private);
            break;
          case 'canvas:command':
            updateCommands((commands) => mergeCommand(commands, message.payload.command));
            break;
          case 'canvas:undo':
            updateCommands(() => message.payload.commands);
            break;
          case 'canvas:clear':
            updateCommands(() => []);
            break;
          case 'chat:message':
            setRoom((current) => current && !current.chat.some((item) => item.id === message.payload.message.id)
              ? { ...current, chat: [...current.chat, message.payload.message].slice(-100) }
              : current);
            break;
          case 'sound:event':
            if (!mutedRef.current) playSound(message.payload.sound);
            break;
          case 'kicked':
            terminal('kicked', message.payload.reason);
            break;
          case 'error':
            setNotice(message.payload.message);
            if (['ROOM_FULL', 'INVALID_ROOM', 'ROOM_NOT_FOUND', 'INVALID_IDENTITY'].includes(message.payload.code)) {
              terminal('lost', message.payload.message);
              socket.close(4409, message.payload.code);
            }
            break;
          default:
            break;
        }
      });

      socket.addEventListener('close', (event) => {
        if (!current()) return;
        if (event.code === 4001) {
          terminal('replaced', 'This room is open in another tab. Your score is saved there.');
          return;
        }
        if (event.code === 4403) {
          terminal('kicked', 'You were removed from this room.');
          return;
        }
        if (event.code === 4404) {
          terminal('lost', 'Room not found or expired. Empty rooms stay available for 10 minutes.');
          return;
        }
        if (event.code === 4401 || event.code === 4409) {
          terminal('lost', event.code === 4409 ? 'This room is full.' : 'Please return using your original browser.');
          return;
        }
        scheduleReconnect();
      });

      socket.addEventListener('error', restart);
    };

    const heartbeat = (wake = false) => {
      if (disposed || stoppedRef.current) return;
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        if (!connecting && (wake || reconnectTimerRef.current === null)) void connect();
        return;
      }
      if (pendingPingAt !== null) {
        // Start a fresh probe after background suspension instead of judging a throttled timer.
        if (wake) pendingPingAt = Date.now();
        else if (Date.now() - pendingPingAt >= 10_000) { void connect(); return; }
      }
      if (wake || (pendingPingAt === null && Date.now() - lastMessageAt >= 20_000)) {
        pendingPingAt = Date.now();
        socket.send('ping');
      }
    };
    const wake = () => heartbeat(true);
    const visibility = () => { if (document.visibilityState === 'visible') wake(); };
    const offline = () => {
      if (stoppedRef.current) return;
      generation += 1;
      probe?.abort();
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close(1000, 'Network offline');
      scheduleReconnect();
    };
    retryRef.current = () => {
      if (disposed) return;
      stoppedRef.current = false;
      void connect();
    };
    void connect();
    const ping = window.setInterval(() => heartbeat(), 5_000);
    window.addEventListener('online', wake);
    window.addEventListener('offline', offline);
    window.addEventListener('pageshow', wake);
    window.addEventListener('focus', wake);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true;
      stoppedRef.current = true;
      joinedRef.current = false;
      generation += 1;
      probe?.abort();
      window.clearInterval(ping);
      clearTimers();
      window.removeEventListener('online', wake);
      window.removeEventListener('offline', offline);
      window.removeEventListener('pageshow', wake);
      window.removeEventListener('focus', wake);
      document.removeEventListener('visibilitychange', visibility);
      socketRef.current?.close(1000, 'Leaving room');
      socketRef.current = null;
    };
  }, [profile.id, roomId, updateCommands]);

  const send = useCallback((message: ClientMessage): boolean => {
    if (!joinedRef.current || socketRef.current?.readyState !== WebSocket.OPEN) {
      setNotice('Still reconnecting—try again in a moment.');
      return false;
    }
    socketRef.current.send(JSON.stringify(message));
    return true;
  }, []);

  const retry = useCallback(() => retryRef.current(), []);
  return { room, privateView, status, notice, send, retry };
}
