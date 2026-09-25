#!/usr/bin/env node
// npx @warp-drive/tutorials <tutorial> [dir] [--solution]
import { cpSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const [tutorial, target = tutorial] = args.filter((a) => !a.startsWith('--'));
const app = args.includes('--solution') ? 'solution' : 'starter';
const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, tutorial ?? '', app);

if (!tutorial || !existsSync(join(source, 'package.template.json'))) {
  console.error(`Usage: npx @warp-drive/tutorials <tutorial> [dir] [--solution]`);
  process.exit(1);
}
if (existsSync(target)) {
  console.error(`${target} already exists`);
  process.exit(1);
}

cpSync(source, target, { recursive: true });
renameSync(join(target, 'gitignore'), join(target, '.gitignore'));

// The app's package.json is its template plus the versions pinned in this package's devDependencies.
const pinned = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).devDependencies;
const { repository, ...template } = JSON.parse(readFileSync(join(target, 'package.template.json'), 'utf8'));
rmSync(join(target, 'package.template.json'));
const pick = (names) => Object.fromEntries(names.map((n) => [n, pinned[n]]));
const pkg = {
  name: basename(target),
  ...template,
  dependencies: pick(template.dependencies),
  devDependencies: pick(template.devDependencies),
};
if (!Object.keys(pkg.dependencies).length) delete pkg.dependencies;
writeFileSync(join(target, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`\n  cd ${target}\n  pnpm install\n  pnpm start\n`);
