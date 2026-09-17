import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { 'cloudflare:workers': fileURLToPath(new URL('./tests/unit/cloudflare-stub.ts', import.meta.url)) } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
