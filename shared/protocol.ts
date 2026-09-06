import type {
  AvatarConfig,
  CanvasCommand,
  FillCommand,
  PlayerProfile,
  RoomSettings,
  RoomView,
  StrokeCommand,
} from './game-types';

export type ClientMessage =
  | { type: 'room:join'; payload: PlayerProfile }
  | { type: 'room:update-settings'; payload: RoomSettings }
  | { type: 'player:update'; payload: { name: string; avatar: AvatarConfig } }
  | { type: 'player:kick'; payload: { playerId: string } }
  | { type: 'player:ping'; payload?: never }
  | { type: 'game:start'; payload?: never }
  | { type: 'game:play-again'; payload?: never }
  | { type: 'game:back-to-lobby'; payload?: never }
  | { type: 'word:select'; payload: { word: string } }
  | { type: 'draw:stroke'; payload: StrokeCommand }
  | { type: 'draw:fill'; payload: FillCommand }
  | { type: 'draw:undo'; payload?: never }
  | { type: 'draw:clear'; payload?: never }
  | { type: 'chat:message'; payload: { text: string } };

export type ServerMessage =
  | { type: 'room:state'; payload: { room: RoomView; private: { selectedWord?: string; wordChoices?: string[] } } }
  | { type: 'player:joined'; payload: { playerId: string } }
  | { type: 'player:left'; payload: { playerId: string; permanent: boolean } }
  | { type: 'player:updated'; payload: { playerId: string } }
  | { type: 'settings:updated'; payload: { settings: RoomSettings } }
  | { type: 'game:started'; payload: { drawerId: string } }
  | { type: 'turn:choosing'; payload: { drawerId: string } }
  | { type: 'turn:started'; payload: { drawerId: string } }
  | { type: 'turn:ended'; payload: { word: string } }
  | { type: 'round:started'; payload: { round: number } }
  | { type: 'game:ended'; payload: { room: RoomView } }
  | { type: 'canvas:command'; payload: { command: CanvasCommand } }
  | { type: 'canvas:undo'; payload: { commands: CanvasCommand[] } }
  | { type: 'canvas:clear'; payload?: never }
  | { type: 'chat:message'; payload: { message: RoomView['chat'][number] } }
  | { type: 'guess:correct'; payload: { playerId: string; score: number } }
  | { type: 'guess:close'; payload: { text: string } }
  | { type: 'sound:event'; payload: { sound: 'warning' | 'correct' | 'turn' | 'game-end' } }
  | { type: 'kicked'; payload: { reason: string } }
  | { type: 'pong'; payload: { serverTime: number } }
  | { type: 'error'; payload: { code: string; message: string } };

export function encodeMessage(message: ServerMessage | ClientMessage): string {
  return JSON.stringify(message);
}
