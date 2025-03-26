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
import { getMonorepoRoot } from './-utils';
import debug from 'debug';
import path from 'path';
import { Compatibility } from './-data/compatibility';

const log = debug('wd:sync-readme-infos');
const COMPATIBILITY_START_PLACEHOLDER = '<!-- START-COMPATIBILITY-TABLE-PLACEHOLDER -->';
const COMPATIBILITY_END_PLACEHOLDER = '<!-- END-COMPATIBILITY-TABLE-PLACEHOLDER -->';

export async function main() {
  log(
    `\n\t${chalk.gray('=').repeat(60)}\n\t\t${chalk.magentaBright('@warp-drive/')}${chalk.greenBright('internal-tooling')} Sync Logos\n\t${chalk.gray('=').repeat(60)}\n\n\t\t${chalk.gray(`Syncing logo files from monorepo root to each public package`)}\n\n`
  );
  const monorepoRoot = await getMonorepoRoot();
  const READMEPath = path.join(monorepoRoot, 'README.md');
  const file = Bun.file(READMEPath);
  const text = await file.text();

  // Update Compatibility Table
  let tableStr = '|  | Status | WarpDrive/EmberData | Lockstep | Supported | Tested | Range |';
  tableStr += '\n| --- | --- | --- | --- | --- | --- | --- |';
  for (const compatibility of Compatibility) {
    let rowStr: string[] = [];
    rowStr.push(compatibility.isActive ? '✅' : compatibility.isSpecialRelease ? '⚠️' : '❌');
    rowStr.push(compatibility.isActive ? compatibility.name : `(unsupported)<br>${compatibility.name}`);
    rowStr.push(
      `![NPM ${compatibility.channel} Version](https://img.shields.io/npm/v/ember-data/${compatibility.channel}?label&color=90EE90)`
    );
    rowStr.push(compatibility.lockstep.map((v) => `\`${v}\``).join('<br>'));
    rowStr.push(compatibility.supported.map((v) => `\`${v}\``).join('<br>'));
    rowStr.push(compatibility.tested.map((v) => `\`${v}\``).join('<br>'));
    rowStr.push(compatibility.range.map((v) => `\`${v}\``).join('<br>'));
    tableStr += `\n| ${rowStr.join(' | ')} |`;
  }

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
