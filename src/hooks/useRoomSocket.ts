import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasCommand, PlayerProfile, PrivateGameView, RoomView } from '../../shared/game-types';
import type { ClientMessage, ServerMessage } from '../../shared/protocol';
import { playSound } from '../lib/sound';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'lost' | 'kicked';

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
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const updateCommands = useCallback((updater: (commands: CanvasCommand[]) => CanvasCommand[]) => {
    setRoom((current) => current ? { ...current, game: { ...current.game, canvasCommands: updater(current.game.canvasCommands) } } : current);
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    const connect = () => {
      if (stoppedRef.current) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/api/rooms/${roomId}/ws`);
      socketRef.current = socket;
      setStatus(attemptRef.current > 0 ? 'reconnecting' : 'connecting');
      setNotice(attemptRef.current > 0 ? 'Reconnecting…' : 'Connecting to room…');

      socket.addEventListener('open', () => {
        attemptRef.current = 0;
        setStatus('connected');
        setNotice('Connected');
        socket.send(JSON.stringify({ type: 'room:join', payload: profile } satisfies ClientMessage));
      });

      socket.addEventListener('message', (event) => {
        let message: ServerMessage;
        try { message = JSON.parse(String(event.data)) as ServerMessage; } catch { return; }
        switch (message.type) {
          case 'room:state':
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
            stoppedRef.current = true;
            setStatus('kicked');
            setNotice(message.payload.reason);
            break;
          case 'error':
            setNotice(message.payload.message);
            if (message.payload.code === 'ROOM_FULL' || message.payload.code === 'INVALID_ROOM') {
              stoppedRef.current = true;
              setStatus('lost');
              socket.close(4409, message.payload.code);
            }
            break;
          default:
            break;
        }
      });

      socket.addEventListener('close', (event) => {
        if (socketRef.current !== socket || stoppedRef.current) return;
        if (event.code === 4403) {
          stoppedRef.current = true;
          setStatus('kicked');
          return;
        }
        if (event.code === 4404) {
          stoppedRef.current = true;
          setStatus('lost');
          setNotice('Room not found or expired.');
          return;
        }
        attemptRef.current += 1;
        setStatus('reconnecting');
        setNotice('Connection lost. Reconnecting…');
        const delay = Math.min(10_000, 1_000 * 2 ** Math.min(attemptRef.current - 1, 4));
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      });

      socket.addEventListener('error', () => socket.close());
    };

    connect();
    const ping = window.setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: 'player:ping' } satisfies ClientMessage));
    }, 25_000);
    return () => {
      stoppedRef.current = true;
      window.clearInterval(ping);
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close(1000, 'Leaving room');
    };
  }, [profile, roomId, updateCommands]);

  const send = useCallback((message: ClientMessage): boolean => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setNotice('Still reconnecting—try again in a moment.');
      return false;
    }
    socketRef.current.send(JSON.stringify(message));
    return true;
  }, []);

  return { room, privateView, status, notice, send };
}
