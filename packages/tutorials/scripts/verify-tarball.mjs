#!/usr/bin/env node
/**
 * Creates every tutorial's apps from a packed @warp-drive/tutorials, outside the repo, and
 * checks they install, type-check, build and pass their tests. Bugs that only show up in a
 * created app have slipped past CI before: a --solution app that kept a starter-only block,
 * and a .gitignore without node_modules/ that the repo's own .gitignore hid.
 *
 *   node packages/tutorials/scripts/verify-tarball.mjs                  # every tutorial
 *   node packages/tutorials/scripts/verify-tarball.mjs todomvc-ember    # one
 *
 * The tarball pins @warp-drive/* to the repo's version, which may not be on npm yet, so those
 * packages are packed from the workspace too, and each app is pointed at them with overrides.
 * The apps are created in a temp dir, which is removed unless something fails.
 *
 * Plain node and pnpm only, no deps. Tests run in headless Chrome.
 */
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const tutorialsDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(tutorialsDir));
// Directives make-starter.mjs reads; none may be left in a --solution app.
const DIRECTIVE = /#[\w-]*-starter\b/;

// A tutorial is any directory here with a `solution/`, as in make-starter.mjs.
const named = process.argv.slice(2);
const known = readdirSync(tutorialsDir).filter((dir) => existsSync(join(tutorialsDir, dir, 'solution')));
const unknown = named.filter((name) => !known.includes(name));
if (!known.length) {
  console.error('No tutorials found: no directory in packages/tutorials has a solution/.');
  process.exit(1);
}
if (unknown.length) {
  console.error(`Unknown tutorial: ${unknown.join(', ')}. Tutorials: ${known.join(', ')}`);
  process.exit(1);
}
const tutorials = named.length ? named : known;

const tmp = mkdtempSync(join(tmpdir(), 'warp-drive-tutorials-'));
if (!relative(repoRoot, tmp).startsWith('..')) {
  console.error(`${tmp} is inside the repo; the apps must be created outside it.`);
  process.exit(1);
}
const failures = [];
const results = [];

const tarballs = packAll();
const pkgDir = join(tmp, 'tutorials');
mkdirSync(pkgDir);
execFileSync('tar', ['-xzf', tarballs['@warp-drive/tutorials'], '-C', pkgDir, '--strip-components=1']);
delete tarballs['@warp-drive/tutorials'];

for (const tutorial of tutorials) {
  for (const app of ['starter', 'solution']) {
    await verifyApp(tutorial, app);
  }
}

console.log('\nResults:');
for (const line of results) console.log(`  ${line}`);
if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(`\nApps left in ${tmp}`);
  process.exit(1);
}
rmSync(tmp, { recursive: true, force: true });

// Packs @warp-drive/tutorials and the @warp-drive packages its apps depend on, directly or
// through each other, from the workspace. `pnpm pack` runs prepack and postpack.
function packAll() {
  const workspace = new Map(
    JSON.parse(execFileSync('pnpm', ['ls', '-r', '--depth', '-1', '--json'], { cwd: repoRoot, encoding: 'utf8' })).map(
      (pkg) => [pkg.name, pkg.path]
    )
  );
  const readPkg = (name) => JSON.parse(readFileSync(join(workspace.get(name), 'package.json'), 'utf8'));
  const internal = (deps) =>
    Object.keys(deps ?? {}).filter((dep) => dep.startsWith('@warp-drive/') && workspace.has(dep));

  const names = new Set(['@warp-drive/tutorials']);
  const queue = internal(readPkg('@warp-drive/tutorials').devDependencies);
  while (queue.length) {
    const name = queue.shift();
    if (names.has(name)) continue;
    names.add(name);
    const pkg = readPkg(name);
    queue.push(...internal(pkg.dependencies), ...internal(pkg.peerDependencies));
  }

  const packed = {};
  for (const name of names) {
    const dest = join(tmp, 'tarballs', name.replace('@warp-drive/', ''));
    mkdirSync(dest, { recursive: true });
    console.log(`\n> pack ${name}`);
    execFileSync('pnpm', ['pack', '--pack-destination', dest], { cwd: workspace.get(name), stdio: 'inherit' });
    packed[name] = join(
      dest,
      readdirSync(dest).find((file) => file.endsWith('.tgz'))
    );
  }
  return packed;
}

async function verifyApp(tutorial, app) {
  const name = `${tutorial}-${app}`;
  const dir = join(tmp, name);
  const fail = (message) => failures.push(`${name}: ${message}`);
  console.log(`\n=== ${name}`);

  const args = [join(pkgDir, 'bin/create.mjs'), tutorial, name];
  if (app === 'solution') args.push('--solution');
  if ((await run('node', args, tmp)).code !== 0) {
    fail('bin/create.mjs failed');
    results.push(`${name}: not created`);
    return;
  }

  if (app === 'solution') {
    for (const file of readdirSync(dir, { recursive: true })) {
      const path = join(dir, file);
      if (!statSync(path).isFile()) continue;
      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (DIRECTIVE.test(line)) fail(`starter directive left in ${file}:${i + 1}: ${line.trim()}`);
        });
    }
  }
  const gitignore = existsSync(join(dir, '.gitignore')) ? readFileSync(join(dir, '.gitignore'), 'utf8') : '';
  if (!/^\/?node_modules\/?\s*$/m.test(gitignore)) fail('.gitignore does not ignore node_modules/');

  // pnpm 11+ reads overrides and settings from pnpm-workspace.yaml, not package.json. The
  // release-age window applies to every pnpm command here, since `pnpm run` re-checks the
  // lockfile against it. An app has no lockfile, and a dependency published minutes before
  // has returned 404 for its tarball.
  const overrides = Object.entries(tarballs).map(
    ([pkg, path]) => `  ${JSON.stringify(pkg)}: ${JSON.stringify(`file:${path}`)}\n`
  );
  writeFileSync(join(dir, 'pnpm-workspace.yaml'), `overrides:\n${overrides.join('')}minimumReleaseAge: 60\n`);

  if ((await run('pnpm', ['install'], dir)).code !== 0) {
    fail('pnpm install failed');
    results.push(`${name}: install failed`);
    return;
  }
  // An ignored override installs @warp-drive/* from npm without an error, so check.
  const fromRegistry = readdirSync(join(dir, 'node_modules/.pnpm')).filter(
    (entry) => entry.startsWith('@warp-drive+') && !entry.includes('@file+')
  );
  if (fromRegistry.length) fail(`@warp-drive packages not installed from the tarballs: ${fromRegistry.join(', ')}`);

  for (const script of ['check:types', 'build:tests']) {
    if ((await run('pnpm', ['run', script], dir)).code !== 0) fail(`${script} failed`);
  }
  const test = await run('pnpm', ['run', 'test'], dir, { CI: 'true' });
  const count = (key) => test.output.match(new RegExp(`^# ${key}\\s+(\\d+)`, 'm'))?.[1] ?? '?';
  if (test.code !== 0) fail('test failed');
  results.push(`${name}: ${count('pass')}/${count('tests')} tests passed`);
}

// Streams a command's output and resolves with its exit code and output.
function run(cmd, args, cwd, env = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => {
        output += chunk;
        (stream === child.stdout ? process.stdout : process.stderr).write(chunk);
      });
    }
    child.on('close', (code) => resolve({ code, output }));
  });
}
