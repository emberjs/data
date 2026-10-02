#!/usr/bin/env node
// npx @warp-drive/tutorials <tutorial> [dir] [--solution]
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = 'Usage: npx @warp-drive/tutorials <tutorial> [dir] [--solution]';
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('-'));
const positional = args.filter((a) => !a.startsWith('-'));
const [tutorial, target = tutorial] = positional;
const app = flags.includes('--solution') ? 'solution' : 'starter';
const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, tutorial ?? '', app);

const unknown = flags.filter((f) => f !== '--solution');
if (unknown.length || positional.length > 2 || !tutorial || !existsSync(join(source, 'package.template.json'))) {
  if (unknown.length) console.error(`Unknown option: ${unknown.join(', ')}`);
  console.error(USAGE);
  process.exit(1);
}
// An existing directory is fine only if it's empty, so `npx @warp-drive/tutorials todomvc-ember .`
// works in a new folder.
const existed = existsSync(target);
if (existed && (!statSync(target).isDirectory() || readdirSync(target).length)) {
  console.error(`${target} already exists and isn't empty`);
  process.exit(1);
}

try {
  create();
} catch (e) {
  // Leave nothing half-made behind, so running the command again works.
  if (existed) {
    for (const entry of readdirSync(target)) rmSync(join(target, entry), { recursive: true, force: true });
  } else {
    rmSync(target, { recursive: true, force: true });
  }
  throw e;
}

console.log(`${target === '.' ? '' : `\n  cd ${target}`}\n  pnpm install\n  pnpm start\n`);

function create() {
  cpSync(source, target, { recursive: true });
  renameSync(join(target, 'gitignore'), join(target, '.gitignore'));

  // The solution marks how the starter differs. A learner's copy doesn't need those lines, so
  // drop them, and drop each starter-only `#add-to-starter` block whole.
  const DIRECTIVE = /^\s*(?:\/\/|\{\{!) #[\w-]*-starter\b/;
  const ADD_OPEN = /^\s*(?:\/\* #add-to-starter|\{\{!-- #add-to-starter)\s*$/;
  const ADD_CLOSE = { '/*': /^\s*\*\/\s*$/, '{{': /^\s*--\}\}\s*$/ };
  function dropDirectives(lines) {
    const kept = [];
    let close = null;
    for (const line of lines) {
      if (close) {
        if (close.test(line)) close = null;
      } else if (ADD_OPEN.test(line)) {
        close = ADD_CLOSE[line.trim().slice(0, 2)];
      } else if (!DIRECTIVE.test(line)) {
        kept.push(line);
      }
    }
    return kept;
  }
  if (app === 'solution') {
    for (const file of readdirSync(target, { recursive: true })) {
      const path = join(target, file);
      if (!statSync(path).isFile()) continue;
      const buffer = readFileSync(path);
      // Binary files (a NUL byte in the first 8000 bytes, as git decides) are left alone.
      if (buffer.subarray(0, 8000).includes(0)) continue;
      const content = buffer.toString('utf8');
      writeFileSync(path, dropDirectives(content.split('\n')).join('\n'));
    }
  }

  // The app's package.json is its template plus the versions pinned in this package's devDependencies.
  const pinned = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).devDependencies;
  const { repository, ...template } = JSON.parse(readFileSync(join(target, 'package.template.json'), 'utf8'));
  rmSync(join(target, 'package.template.json'));
  const pick = (names) =>
    Object.fromEntries(
      names.map((n) => {
        if (!pinned[n]) throw new Error(`${n} has no version in @warp-drive/tutorials' devDependencies`);
        return [n, pinned[n]];
      })
    );
  const pkg = {
    name: basename(resolve(target)),
    ...template,
    dependencies: pick(template.dependencies),
    devDependencies: pick(template.devDependencies),
  };
  if (!Object.keys(pkg.dependencies).length) delete pkg.dependencies;
  writeFileSync(join(target, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
}
