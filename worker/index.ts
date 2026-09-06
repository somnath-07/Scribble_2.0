import { ROOM_ID_ALPHABET, ROOM_ID_LENGTH } from '../shared/constants';
import { generateRoomId } from './game-engine';
import { RoomDurableObject } from './room';
import type { Env } from './types';

export { RoomDurableObject };

function validRoomId(value: string): boolean {
  return value.length === ROOM_ID_LENGTH && Array.from(value).every((character) => ROOM_ID_ALPHABET.includes(character));
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  if ((request.headers.get('content-length') ?? '0').length > 8 || Number(request.headers.get('content-length') ?? 0) > 4_096) {
    return Response.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  }
  let body: string;
  try { body = await request.text(); } catch { return Response.json({ error: 'INVALID_BODY' }, { status: 400 }); }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomId = generateRoomId();
    const stub = env.ROOMS.getByName(roomId);
    const response = await stub.fetch(`https://room.internal/create?roomId=${roomId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    if (response.status === 201) return Response.json({ roomId }, { status: 201 });
    if (response.status !== 409) return response;
  }
  return Response.json({ error: 'ROOM_ID_EXHAUSTED' }, { status: 503 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return Response.json({ ok: true, service: 'scribble-2' });
    }
    if (request.method === 'POST' && url.pathname === '/api/rooms') {
      return createRoom(request, env);
    }
    const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/ws$/);
    if (request.method === 'GET' && match) {
      const roomId = match[1];
      if (!validRoomId(roomId)) return Response.json({ error: 'INVALID_ROOM' }, { status: 400 });
      return env.ROOMS.getByName(roomId).fetch(request);
    }
    if (url.pathname.startsWith('/api/')) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    const asset = await env.ASSETS.fetch(request);
    if (asset.headers.get('content-type')?.includes('text/html')) {
      const html = (await asset.text()).replaceAll('%ORIGIN%', url.origin);
      const headers = new Headers(asset.headers);
      headers.delete('content-length');
      return new Response(html, { status: asset.status, statusText: asset.statusText, headers });
    }
    return asset;
  },
} satisfies ExportedHandler<Env>;
