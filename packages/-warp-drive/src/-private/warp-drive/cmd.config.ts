import { getTags } from '../shared/npm.ts';
import type { CommandConfig, FlagConfig } from '../shared/parse-args.ts';

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
};

const RETROFIT_COMMANDS = ['types', 'mirror'];
export const RETROFIT_OPTIONS: FlagConfig = {
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
