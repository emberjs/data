#!/usr/bin/env node
/**
 * Generate a mapping of public exports for each published package.
 *
 * Changes vs prior version:
 *  - Only considers packages under data/packages/ (already true).
 *  - EXCLUDES any package directory starting with 'unpublished'.
 *  - Skips any matched entry-point file whose path contains '/test-support/'.
 *  - Does NOT include test-support modules or unpublished packages.
 *
 * Process:
 * 1. Find vite.config.mjs under data/packages/* excluding 'unpublished*'.
 * 2. Extract entryPoints array(s) by regex.
 * 3. Expand globs (** and *).
 * 4. For each concrete file (excluding those with /test-support/ in the path):
 *      - Compute module specifier:
 *          index.(js|ts) => <packageName>
 *          else <packageName>/<relative-without-ext>
 *      - Extract exports:
 *          export default ...
 *          export class|function|const|let|var|enum <Name>
 *          export interface|type <Name>
 *          export { a, b as c, type X, default as Y } (optionally with from)
 *          export * from '...'   (record token "*")
 *        Star re-exports are recorded as '*', not expanded.
 * 5. Output array entries:
 *      { module, export, typeOnly, replacement: {} }
 * 6. Sort (module, then default, *, alpha).
 *
 * No external dependencies required.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const repoRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..'); // data/
const packagesDir = path.join(repoRoot, 'packages');
const STAR = '*';

async function main() {
  const viteConfigs = await findFiles(packagesDir, /vite\.config\.mjs$/);

  const allMappings = [];

  for (const configPath of viteConfigs) {
    const pkgRoot = path.dirname(configPath);
    const dirName = path.basename(pkgRoot);

    // Exclude unpublished packages
    if (dirName.startsWith('unpublished')) continue;

    const pkgJsonPath = path.join(pkgRoot, 'package.json');
    let pkgJson;
    try {
      pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
    } catch {
      continue;
    }
    const packageName = pkgJson.name;
    if (!packageName) continue;

    const viteSource = await fs.readFile(configPath, 'utf8');
    const entryPoints = extractEntryPoints(viteSource);

    for (const ep of entryPoints) {
      const absPattern = path.resolve(pkgRoot, ep);
      const matchedFiles = await expandGlob(absPattern);
      for (const absFile of matchedFiles) {
        if (!/\.(mjs|cjs|js|ts)$/.test(absFile)) continue;
        if (absFile.includes(`${path.sep}test-support${path.sep}`)) continue; // skip test-support modules
        const relFromSrc = relativeSrcModule(absFile, pkgRoot);
        if (!relFromSrc) continue;
        const modSpecifier = buildModuleSpecifier(packageName, relFromSrc);
        const source = await fs.readFile(absFile, 'utf8');
        const exports = extractExports(source);
        for (const ex of exports) {
          allMappings.push({
            module: modSpecifier,
            export: ex.name,
            typeOnly: ex.typeOnly,
            replacement: {}
          });
        }
      }
    }
  }

  const finalList = dedupeAndSort(allMappings);
  const outPath = path.join(repoRoot, 'public-exports-mapping.json');
  await fs.writeFile(outPath, JSON.stringify(finalList, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${finalList.length} mappings to ${path.relative(repoRoot, outPath)}`);
}

function extractEntryPoints(source) {
  const entries = [];
  const entryRegex = /export\s+const\s+entryPoints\s*=\s*\[([\s\S]*?)\];?|entryPoints\s*=\s*\[([\s\S]*?)\];?/g;
  const seen = new Set();
  let match;
  while ((match = entryRegex.exec(source))) {
    const body = (match[1] || match[2] || '');
    const items = body
      .split(/[\r\n,]/)
      .map(l => l.trim())
      .filter(Boolean)
      .filter(v => !v.startsWith('//'))
      .map(v => v.replace(/^['"`](.*)['"`]$/, '$1'))
      .filter(Boolean);
    for (const it of items) {
      if (!seen.has(it)) {
        seen.add(it);
        entries.push(it);
      }
    }
  }
  return entries;
}

function relativeSrcModule(absFile, pkgRoot) {
  const srcDir = path.join(pkgRoot, 'src') + path.sep;
  if (!absFile.startsWith(srcDir)) return null;
  return absFile.slice(srcDir.length);
}

function buildModuleSpecifier(packageName, relPath) {
  const withoutExt = relPath.replace(/\.[^.]+$/, '');
  if (withoutExt === 'index') return packageName;
  return `${packageName}/${withoutExt.replace(/\\/g, '/')}`;
}

function extractExports(code) {
  const exports = [];
  const add = (name, typeOnly = false) => exports.push({ name, typeOnly });

  if (/export\s+default\b/.test(code)) add('default', false);
  if (/export\s+\*\s+from\s+['"]/.test(code)) add(STAR, false);

  // Named group exports
  const exportNamed = /export\s+\{([^}]+)\}(\s+from\s+['"][^'"]+['"])?/g;
  let m;
  while ((m = exportNamed.exec(code))) {
    const body = m[1];
    body.split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(chunk => {
        let typeOnly = false;
        let name = chunk;
        if (name.startsWith('type ')) {
          typeOnly = true;
          name = name.slice(5).trim();
        }
        if (/^default\s+as\s+/.test(name)) {
          const target = name.split(/\s+as\s+/)[1];
          if (target) add(target.trim(), false);
          return;
        }
        if (name.includes(' as ')) {
          const [, alias] = name.split(/\s+as\s+/);
            add(alias.trim(), typeOnly);
        } else {
          add(name.trim(), typeOnly);
        }
      });
  }

  // Declaration exports
  const declRegexes = [
    { re: /export\s+(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)/, type: false },
    { re: /export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/, type: false },
    { re: /export\s+const\s+([A-Za-z0-9_$]+)/, type: false },
    { re: /export\s+let\s+([A-Za-z0-9_$]+)/, type: false },
    { re: /export\s+var\s+([A-Za-z0-9_$]+)/, type: false },
    { re: /export\s+enum\s+([A-Za-z0-9_$]+)/, type: false },
    { re: /export\s+interface\s+([A-Za-z0-9_$]+)/, type: true },
    { re: /export\s+type\s+([A-Za-z0-9_$]+)/, type: true }
  ];

  const lines = code.split(/\r?\n/);
  for (const line of lines) {
    for (const { re, type } of declRegexes) {
      const mm = re.exec(line);
      if (mm) add(mm[1], type);
    }
  }

  // De-duplicate
  const seen = new Set();
  return exports.filter(e => {
    const key = `${e.name}:${e.typeOnly}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeAndSort(list) {
  const map = new Map();
  for (const item of list) {
    const key = `${item.module}::${item.export}::${item.typeOnly}`;
    if (!map.has(key)) map.set(key, item);
  }
  const arr = Array.from(map.values());
  const rank = v => (v === 'default' ? 0 : v === STAR ? 1 : 2);
  arr.sort((a, b) => {
    if (a.module !== b.module) return a.module < b.module ? -1 : 1;
    const ra = rank(a.export);
    const rb = rank(b.export);
    if (ra !== rb) return ra - rb;
    if (a.export !== b.export) return a.export < b.export ? -1 : 1;
    return 0;
  });
  return arr;
}

/** Recursively find files whose name matches regex */
async function findFiles(startDir, regex) {
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (regex.test(ent.name)) {
        out.push(full);
      }
    }
  }
  await walk(startDir);
  return out;
}

/** Basic glob expansion supporting *, ** */
async function expandGlob(pattern) {
  if (!pattern.includes('*')) {
    try {
      await fs.access(pattern);
      return [pattern];
    } catch {
      return [];
    }
  }
  const parts = pattern.split(path.sep);
  const results = [];
  async function walk(idx, currentPath) {
    if (idx === parts.length) {
      results.push(currentPath);
      return;
    }
    const part = parts[idx];
    if (part === '**') {
      await walk(idx + 1, currentPath);
      const ents = await safeReadDir(currentPath);
      for (const ent of ents) {
        if (ent.isDirectory()) {
          await walk(idx, path.join(currentPath, ent.name));
        }
      }
      return;
    }
    if (part.includes('*')) {
      const rx = globToRegex(part);
      const ents = await safeReadDir(currentPath);
      for (const ent of ents) {
        if (rx.test(ent.name)) {
          await walk(idx + 1, path.join(currentPath, ent.name));
        }
      }
      return;
    }
    await walk(idx + 1, path.join(currentPath, part));
  }
  const absoluteStart = pattern.startsWith(path.sep);
  await walk(absoluteStart ? 1 : 0, absoluteStart ? path.sep : '.');

  // Only files
  const files = [];
  for (const f of results) {
    try {
      const st = await fs.stat(f);
      if (st.isFile()) files.push(path.resolve(f));
    } catch { /* ignore */ }
  }
  return files;
}

async function safeReadDir(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function globToRegex(glob) {
  const esc = s => s.replace(/[-[\]/{}()+?.\\^$|]/g, '\\$&');
  return new RegExp('^' + glob.split('*').map(esc).join('.*') + '$');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
