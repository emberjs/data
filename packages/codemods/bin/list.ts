import type { Command } from 'commander';
import type { Options } from 'jscodeshift';

import type { CodemodConfig } from './config.js';

export function createListCommand(program: Command, codemods: CodemodConfig[]) {
  program.command('list').description('list available codemods').action(createListAction(codemods));
}

function createListAction(codemods: CodemodConfig[]) {
  return (_options: Options) => {
    const maxNameLength = Math.max(...codemods.map((config) => config.name.length));
    for (const codemod of codemods) {
      const paddedName = codemod.name.padEnd(maxNameLength, ' ');
      // eslint-disable-next-line no-console
      console.log(`${paddedName} - ${codemod.description}`);
    }
  };
}
