import { program } from 'commander';

import { version } from '../package.json';
import { createApplyCommand } from './apply.js';
import { codemods } from './config.js';
import { createListCommand } from './list.js';

program.name('@ember-data/codemods').version(version);

createApplyCommand(program, codemods);
createListCommand(program, codemods);

program.showHelpAfterError();

await program.parseAsync(process.argv);
