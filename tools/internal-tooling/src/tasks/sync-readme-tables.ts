/**
 * Performs various README-related maintenance tasks.
 *
 * For the monorepo root README, this task:
 *
 * - Updates the "Big List of Versions" table with the latest versions of all packages.
 * - Updates the "Compatibility" table with the latest compatibility information.
 *
 */
import chalk from 'chalk';
import { getMonorepoRoot, walkPackages } from './-utils';
import debug from 'debug';
import path from 'path';
import { Compatibility } from './-data/compatibility';
import type { BunFile } from 'bun';
import { Versions, type Version } from './-data/versions';

const log = debug('wd:sync-readme-infos');
const COMPATIBILITY_START_PLACEHOLDER = '<!-- START-COMPATIBILITY-TABLE-PLACEHOLDER -->';
const COMPATIBILITY_END_PLACEHOLDER = '<!-- END-COMPATIBILITY-TABLE-PLACEHOLDER -->';
const VERSIONS_TABLE_START_PLACEHOLDER = '<!-- START-VERSIONS-TABLE-PLACEHOLDER -->';
const VERSIONS_TABLE_END_PLACEHOLDER = '<!-- END-VERSIONS-TABLE-PLACEHOLDER -->';

async function updateCompatibilityTable(file: BunFile) {
  const text = await file.text();

  let tableStr = '\n|  | Status | WarpDrive | Lockstep | Supported | Tested | Range |';
  tableStr += '\n| --- | --- | --- | --- | --- | --- | --- |';
  for (const compatibility of Compatibility) {
    let rowStr: string[] = [];
    rowStr.push(compatibility.isActive ? '✅' : compatibility.isSpecialRelease ? '⚠️' : '❌');
    rowStr.push(
      `${compatibility.isActive ? compatibility.name : `(unsupported)<br>${compatibility.name}`}${compatibility.footnote ? `[^${compatibility.footnote}]` : ''}`
    );
    rowStr.push(
      `![NPM ${compatibility.channel} Version](https://img.shields.io/npm/v/ember-data/${compatibility.channel}?label&color=90EE90)`
    );
    rowStr.push(compatibility.lockstep.map((v) => `\`${v}\``).join('<br>'));
    rowStr.push(compatibility.supported.map((v) => `\`${v}\``).join('<br>'));
    rowStr.push(compatibility.tested.map((v) => `\`${v}\``).join('<br>'));
    rowStr.push(compatibility.range.map((v) => `\`${v}\``).join('<br>'));
    tableStr += `\n| ${rowStr.join(' | ')} |`;
  }

  tableStr += '\n';

  const compatibilityStart = text.indexOf(COMPATIBILITY_START_PLACEHOLDER);
  const compatibilityEnd = text.indexOf(COMPATIBILITY_END_PLACEHOLDER);
  const newReadme =
    text.slice(0, compatibilityStart + COMPATIBILITY_START_PLACEHOLDER.length) +
    tableStr +
    text.slice(compatibilityEnd);

  if (newReadme !== text) {
    log(`\t\t🔧 Updating Compatibility Table`);

    await Bun.write(file, newReadme);
  } else {
    log(`\t\t✅ Compatibility Table is already up to date`);
  }
}

interface VersionWithPath extends Version {
  directory: string;
}

async function updateVersionsTable(file: BunFile) {
  const text = await file.text();
  const publicPackages = new Map<string, VersionWithPath>();
  const privatePackages = new Set<string>();
  Versions.sort((a, b) => (a.name > b.name ? -1 : 1));
  for (const version of Versions) {
    publicPackages.set(version.name, Object.assign({ directory: '' }, version));
  }

  const rootDir = await getMonorepoRoot();

  await walkPackages(async (info) => {
    const { pkg } = info;
    if (!pkg.private) {
      const dir = path.relative(rootDir, info.pkgPath);
      if (!publicPackages.has(pkg.name)) {
        log(`\t\t❌ Package ${pkg.name} is not in the versions list`);
        publicPackages.set(pkg.name, { name: pkg.name, audience: '🐹', directory: dir });
      } else {
        const existing = publicPackages.get(pkg.name)!;
        existing.directory = dir;
      }
    } else {
      privatePackages.add(pkg.name);
    }
  });

  let tableStr = '\n| Package | Audience | Canary | Beta | Stable | LTS | V4-Canary | LTS-4-12 |';
  tableStr += '\n| ------- | -------- | --------- | -------- | --- | ------ | ---- | ------ |';

  for (const [name, version] of publicPackages) {
    if (privatePackages.has(name)) {
      log(`\t\t❌ Package ${name} is marked as public but is private`);
    }

    /*
    | [ember-data](./packages/-ember-data#readme)
    | 🐹
    | ![NPM Canary Version](https://img.shields.io/npm/v/ember-data/canary?label&color=FFBF00)
    | ![NPM Beta Version](https://img.shields.io/npm/v/ember-data/beta?label&color=ff00ff)
    | ![NPM Stable Version](https://img.shields.io/npm/v/ember-data/latest?label&color=90EE90)
    | ![NPM LTS Version](https://img.shields.io/npm/v/ember-data/lts?label&color=0096FF)
    | ![NPM V4 Canary Version](https://img.shields.io/npm/v/ember-data/v4-canary?label&color=FFBF00)
    | ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/ember-data/lts-4-12?label&color=bbbbbb)
    |
    */

    let rowStr: string[] = [];
    rowStr.push(`[${name}](./${version.directory}#readme)`);
    rowStr.push(version.audience);
    rowStr.push(`![NPM Canary Version](https://img.shields.io/npm/v/${name}/canary?label&color=FFBF00)`);
    rowStr.push(`![NPM Beta Version](https://img.shields.io/npm/v/${name}/beta?label&color=ff00ff)`);
    rowStr.push(`![NPM Stable Version](https://img.shields.io/npm/v/${name}/latest?label&color=90EE90)`);
    rowStr.push(`![NPM LTS Version](https://img.shields.io/npm/v/${name}/lts?label&color=0096FF)`);
    rowStr.push(`![NPM V4 Canary Version](https://img.shields.io/npm/v/${name}/v4-canary?label&color=FFBF00)`);
    rowStr.push(`![NPM LTS 4.12 Version](https://img.shields.io/npm/v/${name}/lts-4-12?label&color=bbbbbb)`);
    tableStr += `\n| ${rowStr.join(' | ')} |`;
  }

  tableStr += '\n';

  const versionsStart = text.indexOf(VERSIONS_TABLE_START_PLACEHOLDER);
  const versionsEnd = text.indexOf(VERSIONS_TABLE_END_PLACEHOLDER);
  const newReadme =
    text.slice(0, versionsStart + VERSIONS_TABLE_START_PLACEHOLDER.length) + tableStr + text.slice(versionsEnd);

  if (newReadme !== text) {
    log(`\t\t🔧 Updating Versions Table`);

    await Bun.write(file, newReadme);
  } else {
    log(`\t\t✅ Versions Table is already up to date`);
  }
}

export async function main() {
  log(
    `\n\t${chalk.gray('=').repeat(60)}\n\t\t${chalk.magentaBright('@warp-drive/')}${chalk.greenBright('internal-tooling')} Sync Logos\n\t${chalk.gray('=').repeat(60)}\n\n\t\t${chalk.gray(`Syncing logo files from monorepo root to each public package`)}\n\n`
  );
  const monorepoRoot = await getMonorepoRoot();
  const READMEPath = path.join(monorepoRoot, 'README.md');
  const file = Bun.file(READMEPath);

  await updateCompatibilityTable(file);
  await updateVersionsTable(file);
}
