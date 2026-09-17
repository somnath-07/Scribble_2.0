import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Wrangler bundles this entrypoint with the existing HTTP handler at publish time.
// The Durable Object stays in the existing scribble-2 Worker; Pages binds to it directly.
const output = new URL('../dist/client/', import.meta.url);
// Keep Pages config discovery separate from the Vite plugin's Worker redirect.
const pagesDeployConfig = new URL('../pages/.wrangler/deploy/', import.meta.url);
await mkdir(pagesDeployConfig, { recursive: true });
await writeFile(new URL('config.json', pagesDeployConfig), JSON.stringify({ configPath: '../../wrangler.jsonc' }));
await writeFile(new URL('_worker.js', output), "export { default } from '../../worker/handler.ts';\n");
await writeFile(new URL('_routes.json', output), JSON.stringify({ version: 1, include: ['/*'], exclude: ['/assets/*', '/avatars/*', '/doodle-bg.png', '/favicon.svg', '/og.png'] }));
console.log('Prepared Cloudflare Pages entrypoint in', fileURLToPath(output));
