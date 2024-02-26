import { HELP } from '../help/sections/manual';
import { ABOUT } from '../help/sections/about';
import { normalizeFlag, type CommandConfig, type FlagConfig } from './parse-args';
import { CHANNEL, SEMVER_VERSION, npmDistTagForChannelAndVersion } from './channel';
import { getGitState, getPublishedChannelInfo } from './git';
import chalk from 'chalk';
import semver from 'semver';

/**
 * Like Pick but returns an object type instead of a union type.
 *
 * @internal
 */
type Subset<T, K extends keyof T> = {
  [P in K]: T[P];
};

/**
 * Like Typescript Pick but For Runtime.
 *
 * @internal
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Subset<T, K> {
  const result = {} as Subset<T, K>;

  for (const key of keys) {
    result[key] = obj[key];
  }

  return result;
}

/**
 * Like Object.assign (is Object.assign) but ensures each arg and the result conform to T
 *
 * @internal
 */
export function merge<T>(...args: T[]): T {
  return Object.assign({}, ...args);
}

export const publish_flags_config: FlagConfig = {
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
    description: 'kind of version bump to perform, if any.\nMust be one of "major", "minor", or "patch"',
    type: String,
    examples: [],
    default_value: 'patch',
    validate: (value: unknown) => {
      if (!['major', 'minor', 'patch'].includes(value as string)) {
        throw new Error(`the 'increment' option must be one of 'major', 'minor' or 'patch'`);
      }
    },
  },
  commit: {
    name: 'Commit',
    flag: 'commit',
    flag_aliases: ['c'],
    flag_mispellings: ['cm', 'comit', 'changelog', 'commit_changelog'],
    description: 'Whether to commit the changes to the changelogs',
    type: Boolean,
    examples: [],
    default_value: true,
  },
  // branch: {
  //   name: 'Update Local and Upstream Branch',
  //   flag: 'update_branch',
  //   flag_aliases: [],
  //   flag_mispellings: ['branch'],
  //   description:
  //     'Whether to update the local and upstream branch according to the standard release channel flow. For release this will reset the branch to the current beta. For beta this will reset the branch to the current canary. For lts this will reset the branch to the current release. For lts-prev this is not a valid option.',
  //   type: Boolean,
  //   examples: [],
  //   default_value: false,
  // },
  from: {
    name: 'From Version',
    flag: 'from',
    flag_aliases: ['v'],
    flag_mispellings: ['ver'],
    description: 'The version from which to increment and build a strategy',
    type: String,
    examples: [],
    default_value: async (options: Map<string, string | number | boolean | null>) => {
      const channel = options.get('channel') as CHANNEL;
      if (channel === 'lts' || channel === 'release' || channel === 'beta' || channel === 'canary') {
        if (channel === 'release') {
          return (await getPublishedChannelInfo()).latest;
        }
        return (await getPublishedChannelInfo())[channel];
      }
      return '';
    },
    validate: async (value: unknown) => {
      if (typeof value !== 'string') {
        throw new Error(`Expected a string but got ${value}`);
      }
      if (value.startsWith('v')) {
        throw new Error(`Version passed to promote should not start with 'v'`);
      }
      if (semver.valid(value) === null) {
        throw new Error(`Version passed to promote is not a valid semver version`);
      }
    },
  },
  upstream: {
    name: 'Update Upstream Branch',
    flag: 'upstream',
    flag_aliases: ['u'],
    flag_mispellings: ['upstraem', 'up'],
    description: 'Whether to push the commits and tag upstream',
    type: Boolean,
    examples: [],
    default_value: true,
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

export const release_notes_flags_config: FlagConfig = merge(
  pick(publish_flags_config, ['help', 'increment', 'dry_run', 'dangerously_force', 'tag', 'channel', 'upstream']),
  {
    commit: {
      name: 'Commit',
      flag: 'commit',
      flag_aliases: ['c'],
      flag_mispellings: ['cm', 'comit'],
      description: 'Whether to commit the changes to the changelogs',
      type: Boolean,
      examples: [],
      default_value: true,
    },
    from: {
      name: 'From Version',
      flag: 'from',
      flag_aliases: ['v'],
      flag_mispellings: ['ver', 'release', 'rel'],
      description: 'The version from which to increment and build a strategy',
      type: String,
      examples: [],
      default_value: async (options: Map<string, string | number | boolean | null>) => {
        return (await getPublishedChannelInfo()).latest;
      },
      validate: async (value: unknown) => {
        if (typeof value !== 'string') {
          throw new Error(`Expected a string but got ${value}`);
        }
        if (value.startsWith('v')) {
          throw new Error(`Version passed to promote should not start with 'v'`);
        }
        if (semver.valid(value) === null) {
          throw new Error(`Version passed to promote is not a valid semver version`);
        }
        const versionInfo = semver.parse(value);
        if (versionInfo?.prerelease?.length) {
          throw new Error(`Version passed to promote cannot be prerelease version`);
        }
      },
    },
  }
);

export const promote_flags_config: FlagConfig = merge(
  pick(publish_flags_config, ['help', 'dry_run', 'dangerously_force', 'upstream']),
  {
    version: {
      name: 'Version',
      flag: 'version',
      flag_aliases: ['v'],
      flag_mispellings: ['ver', 'release', 'rel'],
      description: 'The version to promote to LTS',
      type: String,
      examples: [],
      default_value: async (options: Map<string, string | number | boolean | null>) => {
        return (await getPublishedChannelInfo()).latest;
      },
      validate: async (value: unknown) => {
        if (typeof value !== 'string') {
          throw new Error(`Expected a string but got ${value}`);
        }
        if (value.startsWith('v')) {
          throw new Error(`Version passed to promote should not start with 'v'`);
        }
        if (semver.valid(value) === null) {
          throw new Error(`Version passed to promote is not a valid semver version`);
        }
        const versionInfo = semver.parse(value);
        if (versionInfo?.prerelease?.length) {
          throw new Error(`Version passed to promote cannot be prerelease version`);
        }
      },
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
        const version = options.get('version') as SEMVER_VERSION;
        const existing = await getPublishedChannelInfo();

        if (existing.latest === version) {
          return 'lts';
        } else {
          return npmDistTagForChannelAndVersion('lts-prev', version);
        }
      },
      validate: async (value: unknown, options: Map<string, string | number | boolean | null>) => {
        let version = options.get('version') as SEMVER_VERSION;
        const existing = await getPublishedChannelInfo();

        if (!version) {
          version = (await getPublishedChannelInfo()).latest;
        }

        if (value !== 'lts') {
          // older lts channels should match lts-<major>-<minor>
          if (typeof value !== 'string' || !value.startsWith('lts-')) {
            throw new Error(`Expected a tag starting with "lts-" but got ${value}`);
          }

          const expected = npmDistTagForChannelAndVersion('lts-prev', version);

          if (expected !== value) {
            throw new Error(`Expected tag lts or ${expected} for version ${version} but got ${value}`);
          }
        }

        if (existing[value] === version) {
          throw new Error(`Version ${version} is already published to ${value}`);
        }

        const current = existing[value];
        if (current && semver.lt(version, current)) {
          throw new Error(`Version ${version} is less than the latest version ${current}`);
        }
      },
    },
  }
);

export const command_config: CommandConfig = {
  help: {
    name: 'Help',
    cmd: 'help',
    description: 'Output This Manual',
    alt: Array.from(HELP),
    example: '$ bun release help',
  },
  exec: {
    name: 'Execute Command',
    cmd: 'exec',
    description:
      'Executes another release command with the provided arguments, filtering out any args with undefined values.',
    alt: [],
    example: '$ bun release exec promote --version=5.3.0 --tag=lts',
  },
  about: {
    name: 'About',
    cmd: 'about',
    description: 'Print Information About This Script',
    alt: Array.from(ABOUT),
    example: '$ bun release about',
  },
  release_notes: {
    name: 'Release Notes',
    cmd: 'release-notes',
    alt: ['cl', 'changes', 'history', 'notes', 'releasenotes', 'changelog', 'log'],
    description: `Generate release notes for the next release.`,
    options: release_notes_flags_config,
    example: '$ bun release cl',
  },
  latest_for: {
    name: 'Latest For',
    cmd: 'latest-for',
    description: 'Print the latest version for a given channel',
    alt: ['latest'],
    example: '$ bun release latest-for beta',
  },
  promote: {
    name: 'Promote to LTS',
    cmd: 'promote',
    description:
      'Promote a prior release to LTS.\nThis will upate the dist-tags on npm without publishing any new versions or tarballs',
    alt: ['retag', 'lts', 'lts-promote'],
    options: promote_flags_config,
    example: [
      '$ bun release promote',
      '$ bun release promote --version=5.3.0 --tag=lts',
      '$ bun release promote 4.12.5 --tag=lts-4-12',
    ],
  },
  default: {
    name: 'Publish',
    cmd: 'publish',
    default: true,
    description:
      'Publish a new version of EmberData to the specified channel.\nRequires a configured ye<<NODE_AUTH_TOKEN>> with npm access to all associated scopes and packages,\nor the ability to generate an OTP token for the same.',
    options: publish_flags_config,
    example: ['$ bun release', '$ bun release publish'],
  },
};

export function getCommands() {
  const keys = Object.keys(command_config);
  const commands = new Map<string, string>();
  keys.forEach((key) => {
    const cmd = normalizeFlag(key);
    commands.set(cmd, cmd);
    commands.set(command_config[key].cmd, cmd);
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
