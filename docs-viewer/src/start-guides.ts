import { $ } from 'bun';

await Promise.all([$`typedoc`, $`bun ./src/start-guides-sync`, $`vitepress dev docs.warp-drive.io`]);
