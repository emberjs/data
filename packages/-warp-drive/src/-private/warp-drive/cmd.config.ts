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
};

export const Bin = {
  name: 'warp-drive',
  alt: ['warpdrive', 'wd'],
  commands: COMMANDS,
};
