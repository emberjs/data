#!/usr/bin/env bun
import chalk from 'chalk';
import { printHelpDocs } from './help/docs';
import { normalizeFlag } from './utils/parse-args';
import { getCommands } from './utils/flags-config';
import { printAbout } from './help/sections/about';
import { executePublish } from './core/publish';
import { write } from './utils/write';

const COMMANDS = {
  help: printHelpDocs,
  about: printAbout,
  default: executePublish,
};

async function main() {
  const args = Bun.argv.slice(2);

  write(
    chalk.grey(
      `\n\t${chalk.bold(
        chalk.greenBright('Warp') + chalk.magentaBright('Drive')
      )} | Automated Release\n\t==============================`
    ) + chalk.grey(`\n\tengine: ${chalk.cyan('bun@' + Bun.version)}\n`)
  );

  if (args.length === 0) {
    args.push('help');
  }

  const commands = getCommands();
  const cmdString = (commands.get(normalizeFlag(args[0])) as keyof typeof COMMANDS) || 'default';

  const cmd = COMMANDS[cmdString];
  return await cmd(args);
}

await main();
