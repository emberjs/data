#!/usr/bin/env node
/**
 * Generates each tutorial's `starter/` from its `solution/`.
 *
 *   node packages/tutorials/scripts/make-starter.mjs                  # write every starter/
 *   node packages/tutorials/scripts/make-starter.mjs todomvc-ember    # write one
 *   node packages/tutorials/scripts/make-starter.mjs --check          # fail if any starter/ is stale
 *
 * A tutorial is any directory here with a `solution/`; its `starter/` is created
 * if missing. The solution says how its starter differs, next to the code it affects:
 *
 *   // #replace-in-starter TODO (chapter 4): send the create request
 *   await this.store.request(createTodo(attributes));
 *   // #end-replace-in-starter
 *
 * - `// #replace-in-starter <text>` … `// #end-replace-in-starter` is replaced, markers
 *   and all, with `// <text>`.
 * - `// #remove-from-starter` … `// #end-remove-from-starter` is removed.
 * - A block comment that opens with `/* #add-to-starter` on its own line is starter-only
 *   code: a comment in the solution, and its lines, without the comment's opening and
 *   closing lines, in the starter. In templates, write it as `{{!-- #add-to-starter` …
 *   `--}}`. Indent the lines as the starter should have them.
 * - In templates, write each marker as `{{! … }}`.
 * - Blocks can't nest.
 * - `// #omit-file-from-starter` as a file's first line leaves the file out.
 * - Every text file is transformed, and binary files are copied as they are.
 *   Line endings are written as LF.
 * - A block's removal doesn't leave two blank lines in a row.
 * - `#omit-file-from-starter` only parses as a `//` comment, so files without `//`
 *   comments (CSS, HTML, YAML) can't be omitted.
 * - The starter's package.json swaps a trailing `-solution` for `-starter` in its name,
 *   a trailing `/solution` for `/starter` in `repository.directory`, and a leading
 *   `Completed` for `Starter` in its description.
 *
 * It also writes the devDependencies of packages/tutorials/package.json: every
 * app's dependencies. The release pins them when it publishes the package, and
 * bin/create.mjs reads a created app's versions from them.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// A marker is `// #name text` or, in a template, `{{! #name text }}`.
const MARKER_LINE = /^(\s*)(?:\/\/ #(\S+)(?: (\S.*?))?|\{\{! #(\S+)(?: (\S.*?))? \}\})\s*$/;
const BLOCKS = {
  'replace-in-starter': 'end-replace-in-starter',
  'remove-from-starter': 'end-remove-from-starter',
};
const ENDS = Object.values(BLOCKS);
const OMIT = /^\s*\/\/ #omit-file-from-starter\s*$/;
// Starter-only code, commented out in the solution: a `/* #add-to-starter` block comment,
// or `{{!-- #add-to-starter` … `--}}` in a template.
const ADD_OPEN = /^\s*(?:\/\* #add-to-starter|\{\{!-- #add-to-starter)\s*$/;
const ADD_CLOSE = { '/*': /^\s*\*\/\s*$/, '{{': /^\s*--\}\}\s*$/ };
// Any line naming something like a directive, so a misspelled, malformed or outdated one fails
// instead of leaking into the starter.
const DIRECTIVE = /#[\w-]*-starter\b/;

const args = process.argv.slice(2);
const check = args.includes('--check');
const tutorialsDir = dirname(dirname(fileURLToPath(import.meta.url)));
const named = args.filter((arg) => !arg.startsWith('--'));
const known = readdirSync(tutorialsDir).filter((dir) => existsSync(join(tutorialsDir, dir, 'solution')));
const unknown = named.filter((name) => !known.includes(name));
if (unknown.length) {
  console.error(`Unknown tutorial: ${unknown.join(', ')}. Tutorials: ${known.join(', ') || 'none'}`);
  process.exit(1);
}
if (!known.length) {
  console.error(`No tutorials found: no directory in packages/tutorials has a solution/.`);
  process.exit(1);
}
const tutorials = named.length ? named : known;

function transform(file, source) {
  const out = [];
  // The block being cut: its directive and the line it started on.
  let open = null;
  // Set when a block closes, so a blank line after it isn't kept next to a blank line before it.
  let closed = false;
  for (const [i, line] of source.split('\n').entries()) {
    const where = `${file}:${i + 1}`;
    const collapse = closed && line.trim() === '' && (out.length === 0 || out.at(-1).trim() === '');
    closed = false;
    if (collapse) continue;
    if (open?.name === 'add-to-starter') {
      if (ADD_CLOSE[open.syntax].test(line)) {
        open = null;
        closed = true;
      } else {
        if (DIRECTIVE.test(line))
          throw new Error(`${where}: directive inside the #add-to-starter block from line ${open.line}`);
        out.push(line);
      }
      continue;
    }
    if (ADD_OPEN.test(line)) {
      if (open)
        throw new Error(
          `${where}: #add-to-starter inside the #${open.name} block from line ${open.line}; blocks can't nest`
        );
      open = { name: 'add-to-starter', line: i + 1, syntax: line.trim().slice(0, 2) };
      continue;
    }
    const marker = MARKER_LINE.exec(line);
    const name = marker && (marker[2] ?? marker[4]);
    const text = marker && (marker[3] ?? marker[5]);
    if (Object.hasOwn(BLOCKS, name)) {
      if (open)
        throw new Error(`${where}: #${name} inside the #${open.name} block from line ${open.line}; blocks can't nest`);
      if ((name === 'replace-in-starter') !== (text !== undefined))
        throw new Error(`${where}: malformed tutorial starter directive: ${line.trim()}`);
      if (text !== undefined) out.push(marker[2] ? `${marker[1]}// ${text}` : `${marker[1]}{{! ${text} }}`);
      open = { name, line: i + 1 };
      continue;
    }
    if (ENDS.includes(name) && text === undefined) {
      if (!open) throw new Error(`${where}: #${name} without a block to close`);
      if (BLOCKS[open.name] !== name)
        throw new Error(`${where}: #${name} can't close the #${open.name} block from line ${open.line}`);
      open = null;
      closed = true;
      continue;
    }
    if (OMIT.test(line)) throw new Error(`${where}: #omit-file-from-starter must be the file's first line`);
    if (DIRECTIVE.test(line)) throw new Error(`${where}: malformed tutorial starter directive: ${line.trim()}`);
    if (!open) out.push(line);
  }
  if (open) throw new Error(`${file}:${open.line}: #${open.name} is never closed`);
  return out.join('\n');
}

// Edits the raw text rather than re-serializing, so the solution's formatting carries over.
function starterPackageJson(source) {
  const pkg = JSON.parse(source);
  const swaps = [
    ['name', 'name', pkg.name, /-solution$/, '-starter'],
    ['description', 'description', pkg.description, /^Completed\b/, 'Starter'],
    ['repository.directory', 'directory', pkg.repository?.directory, /\/solution$/, '/starter'],
  ];
  for (const [field, key, value, from, to] of swaps) {
    if (typeof value !== 'string' || !from.test(value))
      throw new Error(`solution/package.json: ${field} must match ${from}`);
    const entry = new RegExp(`("${key}"\\s*:\\s*)${JSON.stringify(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    // A replacer function, so a `$` in the value isn't read as a replacement pattern.
    source = source.replace(entry, (_, prefix) => prefix + JSON.stringify(value.replace(from, to)));
  }
  return source;
}

// Tracked and new (untracked but not ignored) files that exist on disk, so build output and
// unstaged deletions are skipped.
function listFiles(dir, ...flags) {
  if (!existsSync(dir)) return [];
  return execFileSync('git', ['ls-files', ...flags], { cwd: dir, encoding: 'utf8' })
    .split('\n')
    .filter((file) => file && existsSync(join(dir, file)));
}

// git's heuristic: a file with a NUL byte in its first 8000 bytes is binary.
const isText = (buffer) => !buffer.subarray(0, 8000).includes(0);

// Reads a file for comparison, with CRLF line endings normalized to LF in text files.
function readNormalized(path) {
  if (!existsSync(path)) return null;
  const buffer = readFileSync(path);
  return isText(buffer) ? Buffer.from(buffer.toString('utf8').replaceAll('\r\n', '\n')) : buffer;
}

// Returns the starter's files, relative to starter/, and their contents.
function generate(solutionDir) {
  const untracked = listFiles(solutionDir, '--others', '--exclude-standard');
  if (untracked.length) console.error(`Including untracked files from solution/: ${untracked.join(', ')}`);
  const files = new Map();
  for (const file of listFiles(solutionDir, '--cached', '--others', '--exclude-standard')) {
    const buffer = readFileSync(join(solutionDir, file));
    if (!isText(buffer)) {
      files.set(file, buffer);
      continue;
    }
    let source = buffer.toString('utf8').replaceAll('\r\n', '\n');
    if (OMIT.test(source.split('\n', 1)[0])) continue;
    source = transform(file, source);
    if (file === 'package.json') source = starterPackageJson(source);
    files.set(file, Buffer.from(source));
  }
  return files;
}

for (const tutorial of tutorials) {
  const tutorialDir = join(tutorialsDir, tutorial);
  const starterDir = join(tutorialDir, 'starter');
  const expected = generate(join(tutorialDir, 'solution'));
  // Files in starter/ that the generator no longer produces, tracked or not.
  const extra = listFiles(starterDir, '--cached', '--others', '--exclude-standard').filter(
    (file) => !expected.has(file)
  );
  const changed = [...expected.keys()].filter(
    (file) => !readNormalized(join(starterDir, file))?.equals(expected.get(file))
  );

  if (check) {
    if (changed.length || extra.length) {
      console.error(`${tutorial}/starter is out of date. These files differ from what the generator produces:`);
      for (const file of [...changed, ...extra]) console.error(`  ${file}`);
      console.error(
        `\nstarter/ is generated from solution/, so don't edit it directly. Make the change in` +
          ` solution/, then run:\n  node packages/tutorials/scripts/make-starter.mjs ${tutorial}`
      );
      process.exitCode = 1;
    } else {
      console.log(`${tutorial}/starter is up to date.`);
    }
  } else {
    for (const file of changed) {
      mkdirSync(dirname(join(starterDir, file)), { recursive: true });
      writeFileSync(join(starterDir, file), expected.get(file));
    }
    for (const file of extra) rmSync(join(starterDir, file), { force: true });
    console.log(`${tutorial}/starter: ${changed.length} written, ${extra.length} removed.`);
  }
}

// Every app's dependencies, from each solution/package.json (a starter has the same ones).
const rootPackagePath = join(tutorialsDir, 'package.json');
const rootPackage = JSON.parse(readFileSync(rootPackagePath, 'utf8'));
const appDependencies = {};
for (const tutorial of known) {
  const pkg = JSON.parse(readFileSync(join(tutorialsDir, tutorial, 'solution', 'package.json'), 'utf8'));
  Object.assign(appDependencies, pkg.dependencies, pkg.devDependencies);
}
const devDependencies = Object.fromEntries(Object.entries(appDependencies).sort(([a], [b]) => a.localeCompare(b)));
if (JSON.stringify(devDependencies) !== JSON.stringify(rootPackage.devDependencies)) {
  if (check) {
    console.error(
      `packages/tutorials/package.json devDependencies are out of date. They must list every app's` +
        ` dependencies. Run:\n  node packages/tutorials/scripts/make-starter.mjs`
    );
    process.exitCode = 1;
  } else {
    rootPackage.devDependencies = devDependencies;
    writeFileSync(rootPackagePath, `${JSON.stringify(rootPackage, null, 2)}\n`);
    console.log('packages/tutorials/package.json: devDependencies written.');
  }
} else if (check) {
  console.log('packages/tutorials/package.json devDependencies are up to date.');
}
