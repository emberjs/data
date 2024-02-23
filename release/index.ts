#!/usr/bin/env bun
import chalk from 'chalk';
import { printHelpDocs } from './help/docs';
import { normalizeFlag } from './utils/parse-args';
import { getCommands } from './utils/flags-config';
import { printAbout } from './help/sections/about';
import { executePublish } from './core/publish';
import { executeReleaseNoteGeneration } from './core/release-notes';
import { write } from './utils/write';
import { promoteToLTS } from './core/promote';

const COMMANDS = {
  help: printHelpDocs,
  about: printAbout,
  release_notes: executeReleaseNoteGeneration,
  publish: executePublish,
  promote: promoteToLTS,
  default: executePublish,
  exec: async (args: string[]) => {
    args.shift();
    const cmd = args[0];

    if (!cmd) {
      throw new Error('No command provided to exec');
    }

    const commands = getCommands();
    const cmdString = (commands.get(normalizeFlag(cmd)) as keyof typeof COMMANDS) || 'default';

    const command = COMMANDS[cmdString];
    if (command) {
      await command(
        args.filter((arg) => {
          return !arg.endsWith('=');
        })
      );
    } else {
      throw new Error(`Command not found: ${cmd}`);
    }
  },
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
  await cmd(args);
  process.exit(0);
}

await main();
