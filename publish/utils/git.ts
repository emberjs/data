import chalk from 'chalk';
import { branchForChannelAndVersion, CHANNEL, channelForBranch, SEMVER_VERSION, VALID_BRANCHES } from './channel';
import { getFile } from './json-file';
import { exec } from './cmd';

export type GIT_STATE = {
  rootVersion: SEMVER_VERSION;
  isClean: boolean;
  isCurrent: boolean;
  isCorrectBranch: boolean;
  branch: string;
  expectedBranch: VALID_BRANCHES;
  expectedChannel: CHANNEL;
};

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
