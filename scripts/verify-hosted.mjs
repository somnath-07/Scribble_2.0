import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

// Opt-in real-time hosted test: creates only disposable rooms and synthetic players.
const origin = process.argv[2];
assert(origin?.startsWith('https://'), 'Usage: node scripts/verify-hosted.mjs https://your-host');
const profile = name => ({ id: crypto.randomUUID(), reconnectToken: crypto.randomUUID(), name, avatar: { body: '#21deec', eyes: 3, mouth: 0, accessory: 0 } });
const sockets = new Set();
async function request(path, options) {
  return fetch(`${origin}${path}`, { ...options, signal: AbortSignal.timeout(20_000) });
}
async function create(identity) {
  const response = await request('/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(identity) });
  assert.equal(response.status, 201);
  return (await response.json()).roomId;
}
async function until(predicate, description, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    assert(Date.now() < deadline, `Timed out: ${description}`);
    await delay(100);
  }
}
async function join(roomId, identity) {
  const socket = new WebSocket(`${origin.replace('https:', 'wss:')}/api/rooms/${roomId}/ws`);
  sockets.add(socket);
  const client = { socket, state: null, error: null, send: (type, payload) => socket.send(JSON.stringify({ type, payload })) };
  socket.addEventListener('error', () => { client.error = 'WebSocket connection failed'; });
  socket.addEventListener('open', () => client.send('room:join', identity));
  socket.addEventListener('message', event => {
    if (event.data === 'pong') return;
    const message = JSON.parse(event.data);
    if (message.type === 'room:state') client.state = message.payload;
    if (message.type === 'error') client.error = message.payload.code;
  });
  await until(() => client.state || client.error, 'join');
  assert.equal(client.error, null);
  return client;
}
async function disconnect(client) {
  client.socket.close(1000, 'Hosted retention test');
  await until(() => client.socket.readyState === WebSocket.CLOSED, 'socket close');
}

try {
  assert.equal((await request('/api/health')).status, 200);
  const hostIdentity = profile('Retention Host');
  const guestIdentity = profile('Retention Guest');
  const roomId = await create(hostIdentity);
  const host = await join(roomId, hostIdentity);
  const guest = await join(roomId, guestIdentity);
  host.send('game:start');
  await until(() => host.state.room.game.phase === 'WORD_SELECTION' && guest.state.room.game.phase === 'WORD_SELECTION', 'game start');
  const drawer = host.state.private.wordChoices ? host : guest;
  const guesser = drawer === host ? guest : host;
  drawer.send('word:select', { word: drawer.state.private.wordChoices[0] });
  await until(() => drawer.state.room.game.phase === 'DRAWING' && guesser.state.room.game.phase === 'DRAWING', 'word selection');
  guesser.send('chat:message', { text: drawer.state.private.selectedWord });
  await until(() => host.state.room.players.every(player => player.score > 0), 'score awards');
  const scores = Object.fromEntries(host.state.room.players.map(player => [player.id, player.score]));
  await disconnect(host);
  await disconnect(guest);
  await delay(1_000);
  const empty = await (await request(`/api/rooms/${roomId}`)).json();
  assert(empty.expiresAt > Date.now());
  const expirationRoom = await create(profile('Expiry Probe'));
  const expiration = await (await request(`/api/rooms/${expirationRoom}`)).json();
  const retentionStarted = Date.now();
  console.log('PASS: hosted HTTPS, two-player WebSockets, gameplay and scoring. Beginning real 10-minute lifecycle check.');
  for (let minute = 1; minute <= 6; minute++) {
    await delay(Math.max(0, retentionStarted + minute * 60_000 - Date.now()));
    assert.equal((await request(`/api/rooms/${roomId}`)).status, 200, 'Empty room must remain available');
    console.log(`PASS: empty room still available after ${minute} minute(s).`);
  }
  const resumed = await join(roomId, guestIdentity);
  for (const player of resumed.state.room.players) assert.equal(player.score, scores[player.id], 'Score must survive six empty minutes');
  assert.equal(resumed.state.room.game.pausedAt, null);
  await disconnect(resumed);
  console.log('PASS: six-minute empty room rejoin restored both scores and resumed the game.');
  await delay(Math.max(0, expiration.expiresAt + 2_000 - Date.now()));
  assert.equal((await request(`/api/rooms/${expirationRoom}`)).status, 404, 'Empty room must expire after ten minutes');
  console.log('PASS: hosted empty-room expiration after ten real minutes. ALL HOSTED LIFECYCLE CHECKS PASSED.');
} finally {
  for (const socket of sockets) if (socket.readyState < WebSocket.CLOSING) socket.close();
}
