import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [
  'chalk',
  'debug',
  'tmp',
  'node:net',
  'node:fs/promises',
  'node:fs',
  'node:os',
  'node:path',
  'node:url',
  'node:http2',
  'node:https',
  'node:child_process',
  'hono',
  'hono/cors',
  'hono/logger',
  '@hono/node-server',
  '@hono/node-ws',
];

export const entryPoints = ['./server/src/index.ts'];

export default createConfig(
  {
    srcDir: './server/src',
    outDir: 'dist-server',
    entryPoints,
    externals,
    target: ['node22'],
    compileTypes: false,
  },
  import.meta.resolve
);
