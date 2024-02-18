import { HELP } from '../help/sections/manual';
import { ABOUT } from '../help/sections/about';
import { normalizeFlag, type CommandConfig, type FlagConfig } from './parse-args';
import { CHANNEL, npmDistTagForChannelAndVersion } from './channel';
import { getGitState } from './git';
import chalk from 'chalk';

export const flags_config: FlagConfig = {
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
    examples: ['./publish/index.ts --help'],
  },
  channel: {
    name: 'Channel',
    flag: 'channel',
    type: String,
    default_value: async (options: Map<string, string | number | boolean | null>) => {
      const gitState = await getGitState(options);
      return gitState.expectedChannel;
    },
    validate: (value: unknown) => {
      if (!['lts', 'release', 'beta', 'canary', 'lts-prev', 'release-prev'].includes(value as string)) {
        throw new Error(`Channel must be one of lts, release, beta, canary, lts-prev, or release-prev. Got ${value}`);
      }
    },
    description:
      'EmberData always publishes to a "release channel".\nTypically this will be one of lts, release, beta, or canary.\nWhen publishing a new version of a non-current lts or non-current release, the channel should be "lts-prev" or "release-prev"',
    examples: ['./publish/index.ts lts', './publish/index.ts publish lts', './publish/index.ts --channel=lts'],
    positional: true,
    positional_index: 0,
    // required: true,
  },
  dry_run: {
    name: 'Dry Run',
    flag: 'dry_run',
    flag_mispellings: ['dry'],
    default_value: false,
    description: 'Do not actually publish, just print what would be done',
    type: Boolean,
    examples: ['./publish/index.ts --channel=stable --dry_run'],
  },
  dangerously_force: {
    name: 'Force Release',
    flag: 'dangerously_force',
    flag_mispellings: [],
    default_value: false,
    description: 'Ignore safety checks and attempt to create and publish a release anyway',
    type: Boolean,
    examples: ['./publish/index.ts --channel=stable --dangerously_force'],
  },
  tag: {
    name: 'NPM Distribution Tag',
    flag: 'tag',
    flag_aliases: ['t'],
    flag_mispellings: ['dist_tag'],
    type: String,
    description: '',
    examples: [],
    default_value: async (options: Map<string, string | number | boolean | null>) => {
      const gitInfo = await getGitState(options);
      return npmDistTagForChannelAndVersion(gitInfo.expectedChannel, gitInfo.rootVersion);
    },
    validate: async (value: unknown, options: Map<string, string | number | boolean | null>) => {
      const channel = options.get('channel') as CHANNEL;
      const gitInfo = await getGitState(options);
      const expectedTag = npmDistTagForChannelAndVersion(channel, gitInfo.rootVersion);
      if (value !== expectedTag) {
        if (!options.get('dangerously_force')) {
          throw new Error(
            `Expected npm dist-tag ${expectedTag} for channel ${channel} on branch ${gitInfo.branch} with version ${gitInfo.rootVersion} but got ${value}`
          );
        } else {
          console.log(
            chalk.red(
              `\t🚨 Expected npm dist-tag ${expectedTag} for channel ${channel} on branch ${
                gitInfo.branch
              } with version ${gitInfo.rootVersion} but got ${value}\n\t\t${chalk.yellow(
                '⚠️ Continuing Due to use of --dangerously-force'
              )}`
            )
          );
        }
      }
    },
  },
  increment: {
    name: 'Version Increment',
    flag: 'increment',
    flag_aliases: ['i', 'b'],
    flag_mispellings: ['inc', 'bump', 'incr'],
    description: 'kind of version bump to perform, if any',
    type: String,
    examples: [],
    default_value: 'patch',
    validate: (value: unknown) => {
      if (!['major', 'minor', 'patch'].includes(value as string)) {
        throw new Error(`the 'increment' option must be one of 'major', 'minor' or 'patch'`);
      }
    },
  },
  pack: {
    name: 'Pack Packages',
    flag: 'pack',
    flag_aliases: ['p'],
    flag_mispellings: ['skip-pack'],
    description: 'whether to pack tarballs for the public packages',
    type: Boolean,
    examples: [],
    default_value: true,
  },
  publish: {
    name: 'Publish Packages to NPM',
    flag: 'publish',
    flag_aliases: ['r'],
    flag_mispellings: ['skip-publish', 'skip-release', 'release'],
    description: 'whether to publish the packed tarballs to the npm registry',
    type: Boolean,
    examples: [],
    default_value: true,
  },
};

export const command_config: CommandConfig = {
  help: {
    name: 'Help',
    cmd: 'help',
    description: 'Output This Manual',
    alt: Array.from(HELP),
    example: '$ ./publish/index.ts help',
  },
  about: {
    name: 'About',
    cmd: 'about',
    description: 'Print Information About This Script',
    alt: Array.from(ABOUT),
    example: '$ ./publish/index.ts about',
  },
  // retag: {},
  default: {
    name: 'Publish',
    cmd: 'publish',
    default: true,
    description: 'Publish a new version of EmberData to the specified channel.',
    options: flags_config,
    example: ['$ ./publish/index.ts', '$ ./publish/index.ts publish'],
  },
};

export function getCommands() {
  const keys = Object.keys(command_config);
  const commands = new Map<string, string>();
  keys.forEach((key) => {
    const cmd = normalizeFlag(key);
    commands.set(cmd, cmd);
    if (command_config[cmd].alt) {
      command_config[cmd].alt!.forEach((alt: string) => {
        const alternate = normalizeFlag(alt);
        if (commands.has(alternate) && commands.get(alternate) !== cmd) {
          throw new Error(`Duplicate command alias ${alternate} for ${cmd} and ${commands.get(alternate)}`);
        }
        commands.set(alternate, cmd);
      });
    }
  });

  return commands;
}
