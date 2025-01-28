import fs from 'fs';
import path from 'path';

import { getTags } from '../shared/npm.ts';
import type { CommandConfig, FlagConfig } from '../shared/parse-args.ts';
import { getPackageList } from '../shared/repo.ts';

export const INSTALL_OPTIONS: FlagConfig = {
  help: {
    name: 'Help',
    flag: 'help',
    flag_aliases: ['h', 'm'],
    flag_mispellings: [
      'desc',
      'describe',
      'doc',
      'docs',
      'dsc',
      'guide',
      'halp',
      'he',
      'hel',
      'hlp',
      'man',
      'mn',
      'usage',
    ],
    type: Boolean,
    default_value: false,
    description: 'Print this usage manual.',
    examples: ['npx warp-drive install --help'],
  },
  root: {
    name: 'Project Root',
    flag: 'root',
    flag_aliases: ['r', 'p'],
    flag_mispellings: ['rt', 'rot', 'route', 'rte', 'project', 'path'],
    type: String,
    default_value() {
      return process.cwd();
    },
    description: 'Path to a directory containing a package.json at which to perform the installation.',
    examples: ['npx warp-drive install --root="./apps/frontend-web"'],
  },
  pnpm: {
    name: 'Use PNPM',
    flag: 'pnpm',
    flag_aliases: [],
    flag_mispellings: [],
    type: Boolean,
    default_value: null,
    description:
      'Whether to use pnpm as the package manager. Defaults to whichever package manager is detected in the project.',
    examples: ['npx warp-drive install --pnpm', 'npx warp-drive install --pnpm=true'],
  },
  yarn: {
    name: 'Use Yarn',
    flag: 'yarn',
    flag_aliases: [],
    flag_mispellings: [],
    type: Boolean,
    default_value: null,
    description:
      'Whether to use yarn as the package manager. Defaults to whichever package manager is detected in the project.',
    examples: ['npx warp-drive install --yarn', 'npx warp-drive install --yarn=true'],
  },
  bun: {
    name: 'Use Bun',
    flag: 'bun',
    flag_aliases: [],
    flag_mispellings: [],
    type: Boolean,
    default_value: null,
    description:
      'Whether to use bun as the package manager. Defaults to whichever package manager is detected in the project.',
    examples: ['npx warp-drive install --bun', 'npx warp-drive install --bun=true'],
  },
  npm: {
    name: 'Use NPM',
    flag: 'npm',
    flag_aliases: [],
    flag_mispellings: [],
    type: Boolean,
    default_value: null,
    description:
      'Whether to use npm as the package manager. Defaults to whichever package manager is detected in the project.',
    examples: ['npx warp-drive install --npm', 'npx warp-drive install --npm=true'],
  },
  use: {
    name: 'Use Package Manager',
    flag: 'use',
    flag_aliases: ['u'],
    flag_mispellings: ['pkgManager', 'pkg', 'packageManager'],
    type: String,
    async default_value(config: Map<string, string | number | boolean | null>) {
      const pnpm = config.get('pnpm') ? 'pnpm' : false;
      const yarn = config.get('yarn') ? 'yarn' : false;
      const npm = config.get('npm') ? 'npm' : false;
      const bun = config.get('bun') ? 'bun' : false;

      const explicitCmd = [pnpm, yarn, npm, bun].filter(Boolean);

      if (explicitCmd.length > 1) {
        throw new Error(
          `Invalid command configuration: multiple package managers specified. Please use only one of ["${explicitCmd.join('", "')}"]}`
        );
      }

      if (explicitCmd.length) {
        return explicitCmd[0];
      }

      const directory = path.join(process.cwd(), (config.get('root') as string) ?? '');
      const projectDetails = await getPackageList(directory);

      return projectDetails.pkgManager;
    },
    description: 'Which package manager to use. Defaults to whichever package manager is detected in the project.',
    examples: ['npx warp-drive install --use=pnpm'],
  },
  tsconfig: {
    name: 'Path to tsconfig.json',
    flag: 'tsconfig',
    flag_aliases: [],
    flag_mispellings: ['types', 'tsc', 'tsconfigPath'],
    type: String,
    default_value: './tsconfig.json',
    description: 'The path to the tsconfig.json for the project, relative to the project root',
    examples: ['npx warp-drive install --tsconfig="../../tsconfig.json"'],
  },
  srcDir: {
    name: 'Source Directory',
    flag: 'src_dir',
    flag_aliases: ['s'],
    flag_mispellings: ['src'],
    type: String,
    default_value(config: Map<string, string | number | boolean | null>) {
      const directory = path.join(process.cwd(), (config.get('root') as string) ?? '');

      // try some educated guesses
      if (fs.existsSync(path.join(directory, 'app'))) return './app';
      if (fs.existsSync(path.join(directory, 'addon'))) return './addon';
      if (fs.existsSync(path.join(directory, 'src'))) return './src';

      return './src';
    },
    description: 'The path toe the source code directory for the project, relative to the project root',
    examples: ['npx warp-drive install --src="./app"'],
  },
};

const RETROFIT_COMMANDS = ['types', 'mirror'];
export const RETROFIT_OPTIONS: FlagConfig = {
  help: {
    name: 'Help',
    flag: 'help',
    flag_aliases: ['h'],
    flag_mispellings: [
      'desc',
      'describe',
      'doc',
      'docs',
      'dsc',
      'guide',
      'halp',
      'he',
      'hel',
      'hlp',
      'man',
      'mn',
      'usage',
    ],
    type: Boolean,
    default_value: false,
    description: 'Print this usage manual.',
    examples: ['npx warp-drive retrofit --help'],
  },
  command_string: {
    name: 'Command String',
    flag: 'command_string',
    type: String,
    description: '<cmd@version> positional shorthand for fits that take a version arg',
    examples: [],
    default_value() {
      return null;
    },
    validate: async (value: unknown) => {
      if (typeof value !== 'string') {
        throw new Error(`Expected <cmdString> to be a string`);
      }
      const [cmd, version] = value.split('@');

      if (!RETROFIT_COMMANDS.includes(cmd)) {
        throw new Error(`Command in <cmd@version> (${value}) must be one of ${RETROFIT_COMMANDS.join(', ')}`);
      }

      if (!version && !value.includes('@')) {
        return;
      }

      const distTags = await getTags('ember-data');
      if (!distTags.has(version)) {
        throw new Error(`version in <cmd@version> (${value}) must be a valid NPM dist-tag`);
      }
    },
    positional: true,
    positional_index: 0,
  },
  fit: {
    name: 'Fit',
    flag: 'fit',
    type: String,
    description: '',
    examples: [],
    default_value: (options: Map<string, string | number | boolean | null>) => {
      const cmdString = options.get('command_string');
      if (!cmdString || typeof cmdString !== 'string') {
        throw new Error(`Must specify a fit to retrofit`);
      }
      const [cmd] = cmdString.split('@');

      if (!RETROFIT_COMMANDS.includes(cmd)) {
        throw new Error(`Command in <cmd@version> (${cmdString}) must be one of ${RETROFIT_COMMANDS.join(', ')}`);
      }

      return cmd;
    },
    validate: (value: unknown) => {
      if (!value || typeof value !== 'string' || !RETROFIT_COMMANDS.includes(value)) {
        throw new Error(`Command (${value as string}) must be one of ${RETROFIT_COMMANDS.join(', ')}`);
      }
    },
  },

  version: {
    name: 'Version',
    flag: 'version',
    type: String,
    description: '',
    examples: [],
    default_value: async (options: Map<string, string | number | boolean | null>) => {
      const cmdString = options.get('command_string');
      if (!cmdString || typeof cmdString !== 'string') {
        throw new Error(`Must specify a fit to retrofit`);
      }
      const [, version] = cmdString.split('@');

      if (!version) {
        throw new Error(`Expected a version to be included in <cmd@version>`);
      }

      const distTags = await getTags('ember-data');
      if (!distTags.has(version)) {
        throw new Error(`version in <cmd@version> (${version}) must be a valid NPM dist-tag`);
      }

      return version;
    },
    validate: async (value: unknown) => {
      if (!value || typeof value !== 'string') {
        throw new Error(`version must be a string`);
      }
      const distTags = await getTags('ember-data');
      if (!distTags.has(value)) {
        throw new Error(
          `version (${value}) must be a valid NPM dist-tag: available ${Array.from(distTags).join(', ')}`
        );
      }
    },
  },

  monorepo: {
    name: 'Monorepo',
    flag: 'monorepo',
    flag_aliases: ['m'],
    type: Boolean,
    description: 'Retrofit a monorepo setup',
    examples: [],
    default_value: false,
  },
};

export const COMMANDS: CommandConfig = {
  help: {
    name: 'Help',
    cmd: 'help',
    description: 'Output This Manual',
    alt: ['doc', 'docs', 'guide', 'h', 'halp', 'he', 'hel', 'help', 'hlp', 'm', 'man', 'mn', 'usage'],
    example: '$ npx warp-drive help',
    default: true,
    load: () => import('./commands/help.ts').then((v) => v.help(Bin)),
  },
  about: {
    name: 'About',
    cmd: 'about',
    description: 'Print Information About This Script',
    alt: ['about', 'abt', 'abut', 'aboot', 'abt', 'describe', 'desc', 'dsc', 'dscr', 'dscrb', 'why', 'y', 'a', 'd'],
    example: '$ npx warp-drive about',
    load: () => import('./commands/about.ts').then((v) => v.about),
  },
  install: {
    name: 'Install',
    cmd: 'install',
    description: 'Adds WarpDrive files and packages to your project based on selections made during install',
    alt: ['i', 'instal', 'insatll'],
    example: '$ npx warp-drive install',
    options: INSTALL_OPTIONS,
    load: () => import('./commands/install.ts').then((v) => v.install),
  },
  retrofit: {
    name: 'Retrofit',
    cmd: 'retrofit',
    description:
      'Updates WarpDrive packages in your project based on selections made during retrofit and existing dependencies in package.json',
    alt: ['r', 'retro', 'update', 'upgrade', 'refit'],
    example: '$ npx warp-drive retrofit',
    options: RETROFIT_OPTIONS,
    load: () => import('./commands/retrofit.ts').then((v) => v.retrofit),
  },
  eject: {
    name: 'Eject',
    cmd: 'eject',
    description:
      'Removes the ember-data package from your project, installing and configuring individual dependencies instead',
    alt: [],
    options: {},
    load: () => import('./commands/eject.ts').then((v) => v.eject),
  },
};

export const Bin = {
  name: 'warp-drive',
  alt: ['warpdrive', 'wd'],
  commands: COMMANDS,
};
