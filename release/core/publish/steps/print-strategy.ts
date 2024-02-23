import { TYPE_STRATEGY } from '../../../utils/channel';
import { getCharLength, getPadding } from '../../../help/-utils';
import chalk from 'chalk';
import { AppliedStrategy } from './generate-strategy';

export const COLORS_BY_STRATEGY: Record<TYPE_STRATEGY, 'red' | 'yellow' | 'green' | 'cyan'> = {
  private: 'red',
  alpha: 'yellow',
  beta: 'cyan',
  stable: 'green',
};

export function colorName(name: string) {
  if (name.startsWith('@warp-drive')) {
    return chalk.greenBright('@warp-drive/') + chalk.magentaBright(name.substring(12));
  } else if (name.startsWith('@ember-data')) {
    return chalk.cyanBright('@ember-data/') + chalk.yellow(name.substring(12));
  } else {
    return chalk.cyan(name);
  }
}

function getPaddedString(str: string, targetWidth: number) {
  const width = targetWidth + (str.length - getCharLength(str));
  return str.padEnd(width);
}

const TABLE_SECTION = Object.freeze([]) as unknown as string[];

function printTable(title: string, rows: string[][]) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => getCharLength(row[i]))));
  const totalWidth = widths.reduce((acc, width) => acc + width + 3, 1);
  const line = getPadding(totalWidth, '-');
  rows.forEach((row, index) => {
    if (row === TABLE_SECTION) {
      row = rows[index] = [];
      widths.forEach((width) => {
        row.push(getPadding(width, '-'));
      });
    }
  });
  const paddedRows = rows.map((row) => row.map((cell, i) => getPaddedString(cell, widths[i])));
  const rowLines = paddedRows.map((row) => `| ${row.join(' | ')} |`);
  rowLines.splice(1, 0, line);
  const finalRows = `\n\t${chalk.white(chalk.bold(title))}\n\t${line}\n\t` + rowLines.join('\n\t') + `\n\t${line}\n\n`;

  console.log(finalRows);
}

export async function printStrategy(config: Map<string, string | number | boolean | null>, applied: AppliedStrategy) {
  const tableRows = [
    ['    ', 'Name', 'From Version', 'To Version', 'Stage', 'Types', 'NPM Dist Tag', 'Status', 'Location'],
  ];
  applied.public_pks.forEach((applied, name) => {
    tableRows.push([
      applied.new ? chalk.magentaBright('New!') : '',
      colorName(name),
      chalk.grey(applied.fromVersion),
      chalk[COLORS_BY_STRATEGY[applied.stage]](applied.toVersion),
      chalk[COLORS_BY_STRATEGY[applied.stage]](applied.stage),
      chalk[COLORS_BY_STRATEGY[applied.types]](applied.types),
      chalk.magentaBright(applied.distTag),
      chalk.cyanBright('public'),
      chalk.grey(applied.pkgDir),
    ]);
  });
  const groups = new Map<string, string[][]>();
  applied.private_pkgs.forEach((applied, name) => {
    let group = groups.get(applied.pkgDir);
    if (!group) {
      group = [];
      groups.set(applied.pkgDir, group);
    }
    group.push([
      applied.new ? chalk.magentaBright('New!') : '',
      colorName(name),
      chalk.grey(applied.fromVersion),
      chalk[COLORS_BY_STRATEGY[applied.stage]](applied.toVersion),
      chalk[COLORS_BY_STRATEGY[applied.stage]](applied.stage),
      chalk[COLORS_BY_STRATEGY[applied.types]](applied.types),
      chalk.grey('N/A'),
      chalk.yellow('private'),
      chalk.grey(applied.pkgDir),
    ]);
  });
  groups.forEach((group) => {
    tableRows.push(TABLE_SECTION);
    tableRows.push(...group);
  });

  printTable(
    chalk.grey(
      `${chalk.white('Release Strategy')} for ${chalk.cyan(config.get('increment'))} bump in ${chalk.cyan(
        config.get('channel')
      )} channel`
    ),
    tableRows
  );
}
