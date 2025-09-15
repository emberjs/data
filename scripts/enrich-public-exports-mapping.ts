#!/usr/bin/env bun
/**
 * Enrich `public-exports-mapping.json` with replacement information from
 * the `warp-drive-packages` source tree (run with Bun or Node).
 *
 * Added: Interactive Mode
 *  - Pass `--interactive` (or `-I`) to be prompted for each mapping entry.
 *  - You will be shown all candidate replacement objects (the same shape as
 *    the objects stored under `replacement.all`), numbered by index.
 *  - Choose an index to override the automatically selected primary candidate.
 *  - Press Enter (or choose `d`) to accept the automatic choice.
 *  - Choose `n` to mark as not found (will set `replacement.notFound = true`).
 *  - Choose `s` to skip (leave automatic choice without changes).
 *
 * For each entry:
 *  1. Collect ALL warp-drive export candidates whose exported symbol name matches.
 *  2. Score candidates against the original (ember-data) module path using heuristic
 *     equivalence mappings / partial path similarity.
 *  3. Pick a "primary" (best) candidate by score (ties broken by root/shortest path)
 *     unless the user overrides in interactive mode.
 *  4. Shallow-check whether the original file actually exports the symbol
 *     (no transitive star resolution). If not, set `replacement.missing = true`.
 *  5. If the original source file contains any `export * from '...'` statement,
 *     set `replacement.starExportFilePath`.
 *  6. Emit a new JSON file `<original>.enriched.json` (or `--out` target).
 *
 * Replacement object shape:
 * {
 *   module?: string;          // primary chosen module specifier
 *   export?: string;          // symbol (or 'default')
 *   sourceFile?: string;      // source file (relative to repo root) for primary choice
 *   typeOnly?: boolean;       // whether primary choice is type-only
 *   score?: number;           // score assigned to primary choice
 *   all: Array<{
 *     module: string;
 *     export: string;
 *     sourceFile: string;
 *     typeOnly: boolean;
 *     score: number;
 *     isRoot: boolean;
 *   }>;
 *   notFound?: true;          // if no candidates found OR user chose none
 *   missing?: true;           // original file lacks this export
 *   starExportFilePath?: string; // original file path if it uses `export *`
 *   userSelectedIndex?: number;  // (only in interactive mode) index chosen by user
 *   userAction?: 'auto' | 'index' | 'none' | 'skip'; // (interactive mode detail)
 * }
 *
 * Heuristic scoring:
 *  - Normalize original module by removing leading '@ember-data/' or 'ember-data/'.
 *  - Normalize candidate by removing '@warp-drive/'.
 *  - Score matches of ordered path segments (exact or via equivalence map).
 *  - Bonus for matching last segment, matching all segments, root match, shortness.
 *  - Small penalty for extra unmatched segments in candidate.
 *
 * Usage:
 *   bun scripts/enrich-public-exports-mapping.ts
 *     --in data/public-exports-mapping.json
 *     --out data/public-exports-mapping.enriched.json
 *     [--interactive] [--debug]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, extname, basename, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

/* ---------------------------------- Types ----------------------------------- */
interface MappingEntry {
  filePath: string;
  module: string;
  export: string;
  typeOnly: boolean;
  replacement: Record<string, unknown>;
}
interface ExportCandidate {
  module: string;
  export: string;
  sourceFile: string;
  typeOnly: boolean;
}
interface ScoredCandidate extends ExportCandidate {
  score: number;
  isRoot: boolean;
}
interface CliOptions {
  in: string;
  wd: string;
  out?: string;
  debug: boolean;
  interactive: boolean;
  showSnippets?: boolean; // NEW
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_INPUT = resolve(__dirname, '..', 'public-exports-mapping-5.5.json');
const DEFAULT_WD = resolve(__dirname, '..', 'public-exports-mapping-wd.json');

// Scoring constants
const SCORE_SEGMENT_MATCH = 3;
const SCORE_LAST_SEGMENT_MATCH = 4;
const SCORE_ALL_SEGMENTS_MATCH = 2;
const SCORE_ROOT_MODULE = 2;
const SCORE_UNMATCHED_PENALTY = 0.5;
const SCORE_LITERAL_MATCH = 0.5;
const SCORE_LITERAL_SEGMENT = 1;

function readJsonFile<T>(filePath: string): T {
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to read or parse JSON file: ${filePath}`, e);
    process.exit(1);
  }
}
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = { in: DEFAULT_INPUT, wd: DEFAULT_WD, debug: false, interactive: false, showSnippets: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--in' || a === '-i') && args[i + 1]) {
      opts.in = resolve(process.cwd(), args[++i]);
    } else if ((a === '--wd' || a === '-w') && args[i + 1]) {
      opts.wd = resolve(process.cwd(), args[++i]);
    } else if ((a === '--out' || a === '-o') && args[i + 1]) {
      opts.out = resolve(process.cwd(), args[++i]);
    } else if (a === '--debug') {
      opts.debug = true;
    } else if (a === '--interactive' || a === '-I') {
      opts.interactive = true;
    } else if (a === '--show-snippets' || a === '-S') {
      opts.showSnippets = true;
    } else if (a === '--help' || a === '-h') {
      console.log(
        `Usage: enrich-public-exports-mapping [--in path] [--wd path] [--out path] [--interactive] [--debug] [--show-snippets]\n\n` +
          `Interactive prompt commands:\n` +
          `  v <n>   View snippet for candidate at index n\n` +
          `  vo      View snippet for the original mapping file/export\n` +
          `  help    Show commands again\n`
      );
      process.exit(0);
    }
  }
  if (!opts.out) {
    opts.out = opts.in.replace(/\.json$/i, '') + '.enriched.json';
  }
  return opts;
}

/* ----------------------------- Export Index Builder -------------------------- */
function buildExportIndex(wdFile: string): Map<string, ExportCandidate[]> {
  const index = new Map<string, ExportCandidate[]>();
  const wdEntries: MappingEntry[] = readJsonFile(wdFile);

  for (const entry of wdEntries) {
    const candidate: ExportCandidate = {
      module: entry.module,
      export: entry.export,
      sourceFile: entry.filePath,
      typeOnly: entry.typeOnly,
    };
    addToIndex(index, entry.export, candidate);

    // For default exports, also index by the "main" export name
    if (entry.export === 'default') {
      handleDefaultExport(index, entry, candidate);
    }
  }
  return index;
}

function addToIndex(index: Map<string, ExportCandidate[]>, name: string, candidate: ExportCandidate) {
  let arr = index.get(name);
  if (!arr) {
    arr = [];
    index.set(name, arr);
  }
  arr.push(candidate);
}

function handleDefaultExport(index: Map<string, ExportCandidate[]>, entry: MappingEntry, candidate: ExportCandidate) {
  const moduleParts = entry.module.split('/');
  const lastPart = moduleParts[moduleParts.length - 1];
  if (lastPart && lastPart !== 'index' && lastPart !== '-private') {
    const mainExportName = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
    addToIndex(index, mainExportName, { ...candidate, export: mainExportName });
  }
}

/* ------------------------------ Scoring Heuristics --------------------------- */
const SEGMENT_EQUIV: Record<string, string[]> = {
  'request-utils': ['utilities', 'request-utils'],
  'legacy-compat': ['legacy'],
  legacy: ['legacy'],
  store: ['core', 'store'],
  model: ['legacy', 'model'],
  'json-api': ['json-api'],
  serializer: ['legacy', 'serializer'],
  adapter: ['legacy', 'adapter'],
  graph: ['core', 'graph'],
  tracking: ['core', 'reactive', 'tracking'],
  'active-record': ['utilities', 'active-record'],
  rest: ['utilities', 'rest'],
  ember: ['ember'],
  diagnostic: ['diagnostic'],
  'build-config': ['build-config'],
  'core-types': ['core', 'types', 'core-types'],
};

function normalizeOriginalModule(mod: string): string[] {
  mod = mod.replace(/^@ember-data\//, '').replace(/^ember-data\/?/, '');
  return mod.split('/').filter(Boolean);
}
function normalizeCandidateModule(mod: string): string[] {
  mod = mod.replace(/^@warp-drive\//, '');
  return mod.split('/').filter(Boolean);
}
function segmentMatches(original: string, candidate: string): boolean {
  if (original === candidate) return true;
  const eq = SEGMENT_EQUIV[original];
  return !!eq && eq.includes(candidate);
}
function scoreCandidate(originalMod: string, candidate: ExportCandidate): number {
  const origSegs = normalizeOriginalModule(originalMod);
  const candSegs = normalizeCandidateModule(candidate.module);

  if (origSegs.length === 0) return 0;

  let score = 0;
  let lastIdx = -1;
  for (const o of origSegs) {
    let found = -1;
    for (let i = lastIdx + 1; i < candSegs.length; i++) {
      if (segmentMatches(o, candSegs[i])) {
        found = i;
        break;
      }
    }
    if (found !== -1) {
      score += SCORE_SEGMENT_MATCH;
      lastIdx = found;
    }
  }

  const lastOrig = origSegs[origSegs.length - 1];
  const lastCand = candSegs[candSegs.length - 1];
  if (segmentMatches(lastOrig, lastCand)) {
    score += SCORE_LAST_SEGMENT_MATCH;
  }

  if (score >= origSegs.length * SCORE_SEGMENT_MATCH) {
    score += SCORE_ALL_SEGMENTS_MATCH;
  }

  if (candSegs.length === 1) {
    score += SCORE_ROOT_MODULE;
  }

  const unmatched = candSegs.length - origSegs.length;
  if (unmatched > 0) {
    score -= unmatched * SCORE_UNMATCHED_PENALTY;
  }

  // Bonus for literal segment matches (not just equivalency)
  for (let i = 0; i < origSegs.length; i++) {
    if (i < candSegs.length && origSegs[i] === candSegs[i]) {
      score += SCORE_LITERAL_MATCH;
    }
  }

  // Additional bonus for having original segment names literally in candidate path
  for (const origSeg of origSegs) {
    if (candSegs.includes(origSeg)) {
      score += SCORE_LITERAL_SEGMENT;
    }
  }

  return score;
}
function isRootModule(c: ExportCandidate): boolean {
  const parts = c.module.split('/');
  return !(parts.length > 2);
}
function choosePrimary(scored: ScoredCandidate[]): ScoredCandidate | undefined {
  if (scored.length === 0) return undefined;
  let best = scored[0];
  for (const c of scored.slice(1)) {
    if (c.score > best.score) {
      best = c;
    } else if (c.score === best.score) {
      if (c.isRoot && !best.isRoot) {
        best = c;
      } else if (c.isRoot === best.isRoot && c.module.length < best.module.length) {
        best = c;
      }
    }
  }
  return best;
}

/* ------------------------- Original File Export Checks ----------------------- */
const STAR_EXPORT_RE = /export\s*\*\s*from\s*['"][^'"]+['"]/;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function fileHasExport(absPath: string, name: string): boolean {
  let code: string;
  try {
    code = readFileSync(absPath, 'utf8');
  } catch {
    return false;
  }
  if (name === 'default') {
    return /export\s+default\b/.test(code);
  }
  const decl = new RegExp(
    `export\\s+(?:abstract\\s+)?(?:class|function|const|let|var|interface|type|enum)\\s+${escapeRegExp(name)}\\b`
  );
  if (decl.test(code)) return true;
  const brace = new RegExp(`export\\s*{[^}]*\\b${escapeRegExp(name)}\\b[^}]*}`, 'm');
  if (brace.test(code)) return true;
  return false;
}
function fileHasStarExport(absPath: string): boolean {
  try {
    const code = readFileSync(absPath, 'utf8');
    return STAR_EXPORT_RE.test(code);
  } catch {
    return false;
  }
}

/* ------------------------------- Prompt Helpers ------------------------------ */
function createPrompter(enabled: boolean) {
  if (!enabled) {
    return async function promptDisabled(): Promise<string> {
      return '';
    };
  }
  let rl: readline.Interface | null = null;
  function getRl(): readline.Interface {
    if (!rl) {
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.on('close', () => {
        rl = null;
      });
    }
    return rl;
  }
  return async function prompt(question: string): Promise<string> {
    return new Promise<string>((resolve) => {
      const rli = getRl();
      rli.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  };
}

/* ------------------------------ Snippet Utilities ---------------------------- */
const fileLineCache = new Map<string, string[]>();

function loadFileLines(absPath: string): string[] | null {
  if (fileLineCache.has(absPath)) return fileLineCache.get(absPath)!;
  try {
    const txt = readFileSync(absPath, 'utf8');
    const lines = txt.split(/\r?\n/);
    fileLineCache.set(absPath, lines);
    return lines;
  } catch {
    return null;
  }
}

function findExportLineIndices(lines: string[], exportName: string): number[] {
  const indices: number[] = [];
  const nameEsc = exportName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const namedDecl = new RegExp(`\\bexport\\b[^;\\n]*\\b${nameEsc}\\b`);
  const namedBrace = new RegExp(`\\bexport\\s*{[^}]*\\b${nameEsc}\\b[^}]*}`);
  const defaultDecl = /\bexport\s+default\b/;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (exportName === 'default') {
      if (defaultDecl.test(ln)) indices.push(i);
    } else if (namedDecl.test(ln) || namedBrace.test(ln)) {
      indices.push(i);
    }
  }
  return indices;
}

function extractSnippet(absPath: string, exportName: string, context = 2): string {
  const lines = loadFileLines(absPath);
  if (!lines) return `(unable to read ${absPath})`;
  const hits = findExportLineIndices(lines, exportName);
  if (hits.length === 0) {
    return `(no direct export statement for "${exportName}" found in ${absPath})`;
  }
  // Take first hit for simplicity
  const idx = hits[0];
  const start = Math.max(0, idx - context);
  const end = Math.min(lines.length - 1, idx + context);
  const numberWidth = String(end + 1).length;
  return lines
    .slice(start, end + 1)
    .map((l, i) => {
      const lineNo = (start + i + 1).toString().padStart(numberWidth, ' ');
      return `${lineNo}: ${l}`;
    })
    .join('\n');
}

type ShikiHighlighter = {
  codeToAnsi?: (code: string, opts: { lang: string; theme: string }) => string;
  codeToThemedTokens?: (code: string, lang: string, theme: string) => any;
};

let __shiki: ShikiHighlighter | null = null;
let __shikiReady: Promise<ShikiHighlighter> | null = null;
const SHIKI_THEME = 'everforest-dark'; // pick a single theme for consistency (terminal)
const SHIKI_LANGS = ['ts', 'js'];

async function getShiki(): Promise<ShikiHighlighter> {
  if (__shiki) return __shiki;
  if (!__shikiReady) {
    __shikiReady = (async () => {
      try {
        // Try modern API first
        const shiki: any = await import('shiki');
        if (typeof shiki.getHighlighter === 'function') {
          const highlighter = await shiki.getHighlighter({
            themes: [SHIKI_THEME],
            langs: SHIKI_LANGS,
          });
          return highlighter;
        }
        // Fallback (future API variants)
        return shiki;
      } catch {
        return {};
      }
    })();
  }
  __shiki = await __shikiReady;
  return __shiki;
}

function detectSnippetLang(filePath: string): 'ts' | 'js' {
  const ext = filePath.split('.').pop();
  if (ext === 'ts' || ext === 'tsx' || ext === 'd.ts') return 'ts';
  return 'js';
}

// Simple fallback minimal keyword colorizer (only used if Shiki unavailable)
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};
function fallbackColor(code: string): string {
  return code
    .replace(
      /\b(export|import|from|class|interface|type|enum|function|const|let|var|async|await)\b/g,
      `${ANSI.cyan}$1${ANSI.reset}`
    )
    .replace(
      /\b(new|return|extends|implements|public|private|protected|readonly)\b/g,
      `${ANSI.magenta}$1${ANSI.reset}`
    );
}

// Highlight raw snippet text (without line numbers) -> ANSI colored code lines
async function highlightCode(raw: string, lang: 'ts' | 'js'): Promise<string> {
  if (!process.stdout.isTTY || process.env.NO_COLOR) {
    return raw;
  }
  try {
    const shiki = await getShiki();
    if (shiki && typeof (shiki as any).codeToAnsi === 'function') {
      return (shiki as any).codeToAnsi(raw, { lang, theme: SHIKI_THEME });
    }
    if (shiki && typeof (shiki as any).codeToThemedTokens === 'function') {
      // Older style: generate tokens then try renderToAnsi if exported
      const tokens = (shiki as any).codeToThemedTokens(raw, lang, SHIKI_THEME);
      const maybeRender = (await import('shiki')).renderToAnsi?.(tokens);
      if (maybeRender) return maybeRender;
    }
    return fallbackColor(raw);
  } catch {
    return fallbackColor(raw);
  }
}

/* ------------------------------ Snippet Utilities ---------------------------- */
// (replace existing extractSnippet with a raw extractor + formatter)

function extractSnippetRaw(
  absPath: string,
  exportName: string,
  context = 2
): { raw: string; start: number; error?: string } {
  const lines = loadFileLines(absPath);
  if (!lines) return { raw: `(unable to read ${absPath})`, start: 0, error: 'read' };
  const hits = findExportLineIndices(lines, exportName);
  if (hits.length === 0) {
    return { raw: `(no direct export statement for "${exportName}" found in ${absPath})`, start: 0, error: 'notfound' };
  }
  const idx = hits[0];
  const start = Math.max(0, idx - context);
  const end = Math.min(lines.length - 1, idx + context);
  return { raw: lines.slice(start, end + 1).join('\n'), start };
}

async function formatSnippet(
  absPath: string,
  exportName: string,
  { context = 2 }: { context?: number } = {}
): Promise<string> {
  const { raw, start, error } = extractSnippetRaw(absPath, exportName, context);
  if (error) return raw; // message string already
  const lang = detectSnippetLang(absPath);
  const highlighted = await highlightCode(raw, lang);
  const lines = highlighted.split('\n');
  const plainLineCount = raw.split('\n').length;
  const numberWidth = String(start + plainLineCount).length;

  // If highlighting inserted ANSI codes spanning lines, we rely on splitting above
  return lines.map((l, i) => `${String(start + i + 1).padStart(numberWidth, ' ')}: ${l}`).join('\n');
}

/* ---------------------------- Interactive Selection -------------------------- */
async function interactiveSelect(
  entry: MappingEntry,
  scored: ScoredCandidate[],
  primary: ScoredCandidate | undefined,
  prompt: (q: string) => Promise<string>,
  {
    repoRoot,
    showSnippets,
  }: {
    repoRoot: string;
    showSnippets: boolean;
  }
): Promise<{ primary: ScoredCandidate | undefined; userMeta?: { userSelectedIndex?: number; userAction: string } }> {
  const header = `${entry.module} :: ${entry.export}`;
  console.log('\n' + '-'.repeat(header.length));
  console.log(header);
  console.log('-'.repeat(header.length));

  const originalAbs = resolve(repoRoot, entry.filePath);

  if (scored.length === 0) {
    console.log('No candidates found.');
    const ans = await prompt('Press Enter to continue, or type anything to mark as notFound: ');
    if (ans === '') {
      return { primary, userMeta: { userAction: 'auto' } };
    }
    return { primary: undefined, userMeta: { userAction: 'none' } };
  }

  const sorted = [...scored].sort(
    (a, b) => b.score - a.score || (a.isRoot === b.isRoot ? a.module.localeCompare(b.module) : a.isRoot ? -1 : 1)
  );
  const defaultIndex = primary ? sorted.findIndex((c) => c === primary) : -1;

  console.log('Candidates:');

  for (let idx = 0; idx < sorted.length; idx++) {
    const c = sorted[idx];
    const obj = {
      module: c.module,
      export: c.export,
      sourceFile: c.sourceFile,
      typeOnly: c.typeOnly,
      score: Number(c.score.toFixed(2)),
      isRoot: c.isRoot,
    };
    const marker = idx === defaultIndex ? ' (default)' : '';
    console.log(`[${idx}] ${JSON.stringify(obj)}${marker}`);
    if (showSnippets) {
      const abs = resolve(repoRoot, c.sourceFile);
      const snippet = await formatSnippet(abs, c.export);
      console.log(`    └─ snippet:\n${indent(snippet, 8)}`);
    }
  }

  if (showSnippets) {
    console.log('\nOriginal file snippet:');
    console.log(indent(await formatSnippet(originalAbs, entry.export), 2));
  }

  console.log(
    '\nCommands: number = choose, Enter/d = accept default, n = none, s = skip, q = quit,\n' +
      'v <n> = view candidate snippet, vo = view original snippet, help = show commands.'
  );

  while (true) {
    const ans = await prompt('Selection [Enter=d]: ');
    const trimmed = ans.trim();

    if (trimmed === '' || trimmed.toLowerCase() === 'd') {
      return { primary, userMeta: { userSelectedIndex: defaultIndex, userAction: 'auto' } };
    }
    if (trimmed === 's') {
      return { primary, userMeta: { userSelectedIndex: defaultIndex, userAction: 'skip' } };
    }
    if (trimmed === 'n') {
      return { primary: undefined, userMeta: { userAction: 'none' } };
    }
    if (trimmed === 'q') {
      console.log('Aborting by user request.');
      process.exit(130);
    }
    if (trimmed === 'help') {
      console.log(
        'Commands:\n' +
          '  <index>  choose candidate\n' +
          '  Enter/d  accept default\n' +
          '  n        mark none/notFound\n' +
          '  s        skip (keep automatic)\n' +
          '  q        quit\n' +
          '  v <n>    view snippet for candidate n\n' +
          '  vo       view snippet for original file\n'
      );
      continue;
    }
    if (trimmed === 'vo') {
      console.log('\n[Original Snippet]');
      console.log(await formatSnippet(originalAbs, entry.export));
      continue;
    }
    if (trimmed.startsWith('v ')) {
      const idxStr = trimmed.slice(2).trim();
      const idx = Number(idxStr);
      if (!Number.isNaN(idx) && idx >= 0 && idx < sorted.length) {
        const cand = sorted[idx];
        const abs = resolve(repoRoot, cand.sourceFile);
        console.log(`\n[Snippet ${idx} ${cand.module} :: ${cand.export}]`);
        console.log(await formatSnippet(abs, cand.export));
      } else {
        console.log('Invalid index for snippet.');
      }
      continue;
    }

    const idx = Number(trimmed);
    if (!Number.isNaN(idx) && idx >= 0 && idx < sorted.length) {
      const chosen = sorted[idx];
      return { primary: chosen, userMeta: { userSelectedIndex: idx, userAction: 'index' } };
    }
    console.log('Invalid selection. Type help for commands.');
  }
}

function indent(text: string, spaces = 2): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((l) => pad + l)
    .join('\n');
}

/* ------------------------------- Enrichment Core ----------------------------- */
async function enrich(
  entries: MappingEntry[],
  repoRoot: string,
  exportIndex: Map<string, ExportCandidate[]>,
  {
    debug,
    interactive,
    showSnippets,
  }: {
    debug: boolean;
    interactive: boolean;
    showSnippets: boolean;
  }
): Promise<MappingEntry[]> {
  const prompt = createPrompter(interactive && process.stdin.isTTY);

  for (const entry of entries) {
    entry.replacement = await processEntry(entry, repoRoot, exportIndex, prompt, { debug, interactive }, showSnippets);
  }
  return entries;
}

async function processEntry(
  entry: MappingEntry,
  repoRoot: string,
  exportIndex: Map<string, ExportCandidate[]>,
  prompt: (q: string) => Promise<string>,
  { debug, interactive }: { debug: boolean; interactive: boolean },
  showSnippets: boolean
): Promise<Record<string, unknown>> {
  const candidates = exportIndex.get(entry.export) || [];
  let allCandidates = [...candidates];

  if (entry.export === 'default') {
    const moduleParts = entry.module.split('/');
    const lastPart = moduleParts[moduleParts.length - 1];
    if (lastPart && lastPart !== 'index' && lastPart !== '-private') {
      const mainExportName = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
      const mainCandidates = exportIndex.get(mainExportName) || [];
      allCandidates = [...candidates, ...mainCandidates];
    }
  }

  const scored: ScoredCandidate[] = allCandidates.map((c) => ({
    ...c,
    score: scoreCandidate(entry.module, c),
    isRoot: isRootModule(c),
  }));

  let primary = choosePrimary(scored);

  // Deterministic ordering
  const allSorted = scored.sort(
    (a, b) => b.score - a.score || (a.isRoot === b.isRoot ? a.module.localeCompare(b.module) : a.isRoot ? -1 : 1)
  );
  const allForReplacement = allSorted.map((c) => ({
    module: c.module,
    export: c.export,
    sourceFile: c.sourceFile,
    typeOnly: c.typeOnly,
    score: Number(c.score.toFixed(2)),
    isRoot: c.isRoot,
  }));

  let userMeta: { userSelectedIndex?: number; userAction: string } | undefined;

  // NEW: If there's exactly one candidate, auto-accept it even in interactive mode.
  if (interactive && process.stdin.isTTY && allSorted.length === 1 && primary) {
    userMeta = { userSelectedIndex: 0, userAction: 'auto' };
  } else if (interactive && process.stdin.isTTY) {
    const result = await interactiveSelect(entry, allSorted, primary, prompt, {
      repoRoot,
      showSnippets,
    });
    primary = result.primary;
    userMeta = result.userMeta;
  }

  const replacement: Record<string, unknown> = {
    all: allForReplacement,
  };

  if (!primary) {
    if (scored.length === 0 || userMeta?.userAction === 'none') {
      replacement.notFound = true;
    }
  } else {
    replacement.module = primary.module;
    replacement.export = primary.export;
    replacement.sourceFile = primary.sourceFile;
    replacement.typeOnly = primary.typeOnly;
    replacement.score = Number(primary.score.toFixed(2));
  }

  const originalAbs = resolve(repoRoot, entry.filePath);
  if (!fileHasExport(originalAbs, entry.export)) {
    replacement.missing = true;
  }
  if (fileHasStarExport(originalAbs)) {
    replacement.starExportFilePath = entry.filePath;
  }

  if (userMeta) {
    replacement.userAction = userMeta.userAction;
    if (typeof userMeta.userSelectedIndex === 'number') {
      replacement.userSelectedIndex = userMeta.userSelectedIndex;
    }
  } else {
    replacement.userAction = 'auto';
  }

  if (debug) {
    console.log(
      `[DEBUG] ${entry.module} :: ${entry.export} -> ${
        primary
          ? `${primary.module} (score=${primary.score.toFixed(2)}${userMeta?.userAction === 'index' ? ', user' : ''})`
          : 'NOT FOUND'
      }`
    );
  }

  return replacement;
}

/* -------------------------------- Entry Point -------------------------------- */
async function main() {
  const { in: inFile, wd: wdFile, out, debug, interactive, showSnippets } = parseArgs();
  const repoRoot = resolve(__dirname, '..');

  const entries: MappingEntry[] = readJsonFile(inFile);

  console.log('Building export index from warp-drive mapping file...');
  const exportIndex = buildExportIndex(wdFile);
  console.log(`Export index built with ${exportIndex.size} distinct symbol names.`);

  console.log('Enriching mapping entries ...');
  if (interactive && !process.stdin.isTTY) {
    console.warn('Interactive mode requested but stdin is not a TTY. Proceeding non-interactively.');
  }
  const enriched = await enrich(entries, repoRoot, exportIndex, {
    debug,
    interactive: interactive && process.stdin.isTTY,
    showSnippets: !!showSnippets,
  });

  writeFileSync(out!, JSON.stringify(enriched, null, 2) + '\n', 'utf8');
  console.log(`Wrote enriched mapping to ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
