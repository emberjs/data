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
import { latestFor } from './core/latest-for';

const COMMANDS = {
  help: printHelpDocs,
  about: printAbout,
  release_notes: executeReleaseNoteGeneration,
  publish: executePublish,
  latest_for: latestFor,
  promote: promoteToLTS,
  default: executePublish,
  exec: async (args: string[]) => {
    const cmd = args.shift();

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

  const commandArg = args.length === 0 ? 'help' : normalizeFlag(args[0]);
  const commands = getCommands();
  const cmdString = (commands.get(commandArg) as keyof typeof COMMANDS) || 'default';
  const cmd = COMMANDS[cmdString];

  // we silence output for the latest_for command
  if (cmdString !== 'latest_for') {
    write(
      chalk.grey(
        `\n\t${chalk.bold(
          chalk.greenBright('Warp') + chalk.magentaBright('Drive')
        )} | Automated Release\n\t==============================`
      ) + chalk.grey(`\n\tengine: ${chalk.cyan('bun@' + Bun.version)}\n`)
    );
  }

  if (args.length && commands.has(commandArg)) {
    args.shift();
  }

  await cmd(args);
  process.exit(0);
}

await main();
