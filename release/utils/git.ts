import chalk from 'chalk';
import {
  branchForChannelAndVersion,
  CHANNEL,
  channelForBranch,
  npmDistTagForChannelAndVersion,
  SEMVER_VERSION,
  VALID_BRANCHES,
} from './channel';
import { getFile } from './json-file';
import { exec } from './cmd';
import { gatherPackages, loadStrategy, Package } from './package';
import path from 'path';

export type LTS_TAG = `lts-${number}-${number}`;
export type RELEASE_TAG = `release-${number}-${number}`;
export type GIT_TAG =
  | `v${number}.${number}.${number}`
  | `v${number}.${number}.${number}-alpha.${number}`
  | `v${number}.${number}.${number}-beta.${number}`;

export type CHANNEL_VERSIONS = {
  latest: SEMVER_VERSION;
  beta: SEMVER_VERSION;
  canary: SEMVER_VERSION;
  lts: SEMVER_VERSION;
  [key: LTS_TAG | RELEASE_TAG]: SEMVER_VERSION | undefined;
};

export type GIT_STATE = {
  rootVersion: SEMVER_VERSION;
  isClean: boolean;
  isCurrent: boolean;
  isCorrectBranch: boolean;
  branch: string;
  expectedBranch: VALID_BRANCHES;
  expectedChannel: CHANNEL;
};

let _NPM_INFO: Record<string, unknown> | null = null;
export async function getPublishedChannelInfo(
  options: Map<string, boolean | string | number | null>
): Promise<CHANNEL_VERSIONS> {
  if (!_NPM_INFO) {
    const gitInfo = await exec(['npm', 'view', 'ember-data@latest', '--json']);
    _NPM_INFO = JSON.parse(gitInfo) as Record<string, unknown>;
  }
  return _NPM_INFO['dist-tags'] as CHANNEL_VERSIONS;
}

let _GIT_STATE: GIT_STATE | null = null;
export async function getGitState(options: Map<string, boolean | string | number | null>): Promise<GIT_STATE> {
  if (_GIT_STATE) {
    return _GIT_STATE;
  }
  const dangerously_force = options.get('dangerously_force') as boolean;
  const isHelp = options.get('help') as boolean;
  const status = await exec(['git', 'status']);
  let clean = true;
  let current = true;

  if (!status.match(/^nothing to commit/m)) {
    clean = false;
    if (dangerously_force || isHelp) {
      const base = chalk.white('\t⚠️  Local Git branch has uncommitted changes!');
      console.log(
        dangerously_force
          ? base +
              chalk.yellow('\n\t\tPassed option: ') +
              chalk.white('--dangerously-force') +
              chalk.grey(' :: ignoring unclean git working tree')
          : base
      );
      if (!isHelp) {
        await exec('git add -A');
        await exec(['git', 'commit', '-m', '"publish: stash of uncommitted changes by release script"']);
      }
    } else {
      console.log(
        chalk.red('💥 Git working tree is not clean. 💥 \n\t') +
          chalk.grey('Use ') +
          chalk.white('--dangerously-force') +
          chalk.grey(' to ignore this warning and publish anyway\n') +
          chalk.yellow('⚠️  Publishing from an unclean working state may result in a broken release ⚠️\n\n') +
          chalk.grey(`Status:\n${status}`)
      );
      process.exit(1);
    }

    if (!status.match(/^Your branch is up to date with/m)) {
      current = false;
      if (dangerously_force || isHelp) {
        const base = chalk.white('\t⚠️  Local Git branch is not in sync with origin branch');
        console.log(
          dangerously_force
            ? base +
                chalk.yellow('\n\t\tPassed option: ') +
                chalk.white('--dangerously-force') +
                chalk.grey(' :: ignoring unsynced git branch')
            : base
        );
      } else {
        console.log(
          chalk.red('💥 Local Git branch is not in sync with origin branch. 💥 \n\t') +
            chalk.grey('Use ') +
            chalk.white('--dangerously-force') +
            chalk.grey(' to ignore this warning and publish anyway\n') +
            chalk.yellow('⚠️  Publishing from an unsynced working state may result in a broken release ⚠️') +
            chalk.grey(`Status:\n${status}`)
        );
        process.exit(1);
      }
    }
  }

  const rootPkg = await getFile<{ version: SEMVER_VERSION }>(`${process.cwd()}/package.json`).read();
  const rootVersion = rootPkg.version;

  const foundBranch = status.split('\n')[0].replace('On branch ', '');
  const channel =
    (options.get('channel') as CHANNEL) || channelForBranch(foundBranch, rootVersion, dangerously_force || isHelp);
  const expectedBranch = branchForChannelAndVersion(channel, rootVersion);

  if (foundBranch !== expectedBranch) {
    if (dangerously_force || isHelp) {
      const base = chalk.white(
        `\t⚠️  Expected to publish the release-channel '${channel}' from the git branch '${expectedBranch}', but found '${foundBranch}'`
      );
      console.log(
        dangerously_force
          ? base +
              chalk.yellow('\n\t\tPassed option: ') +
              chalk.white('--dangerously-force') +
              chalk.grey(' :: ignoring unexpected branch')
          : base
      );
    } else {
      console.log(
        chalk.red(
          `💥 Expected to publish the release-channel '${channel}' from the git branch '${expectedBranch}', but found '${foundBranch}' 💥 \n\t`
        ) +
          chalk.grey('Use ') +
          chalk.white('--dangerously-force') +
          chalk.grey(' to ignore this warning and publish anyway\n') +
          chalk.yellow('⚠️  Publishing from an incorrect branch may result in a broken release ⚠️')
      );
      process.exit(1);
    }
  }

  _GIT_STATE = {
    rootVersion,
    isClean: clean,
    isCurrent: current,
    isCorrectBranch: foundBranch === expectedBranch,
    branch: foundBranch,
    expectedBranch,
    expectedChannel: channel,
  };
  return _GIT_STATE;
}

export async function getAllPackagesForGitTag(tag: GIT_TAG): Promise<Map<string, Package>> {
  const relativeTmpDir = `./tmp/${tag}`;
  await exec(['mkdir', '-p', relativeTmpDir]);
  await exec({ cmd: ['sh', '-c', `git archive ${tag} | tar -xC ${relativeTmpDir}`] });

  const tmpDir = path.join(process.cwd(), relativeTmpDir);
  try {
    const strategy = await loadStrategy(tmpDir);
    return gatherPackages(strategy.config, tmpDir);
  } catch (e) {
    // if strategy does not exist we may be pre-strategy days
    // so we will just gather all packages from the packages directory

    return gatherPackages({ packageRoots: ['packages/*'] }, tmpDir);
  }
}

export async function pushLTSTagToRemoteBranch(tag: GIT_TAG, force?: boolean): Promise<void> {
  const sha = await exec({ cmd: `git rev-list -n 1 ${tag}` });
  const branch = npmDistTagForChannelAndVersion('lts-prev', tag.slice(1) as SEMVER_VERSION);
  const oldSha = await exec({ cmd: `git rev-list -n 1 refs/heads/${branch}` });
  let cmd = `git push origin refs/tags/${tag}:refs/heads/${branch}`;
  if (force) cmd += ' -f';
  await exec({ cmd });
  console.log(chalk.green(`✅ Pushed ${tag} to ${branch} (${oldSha.slice(0, 10)} => ${sha.slice(0, 10)})`));
}
