import chalk from 'chalk';
import { CHANNEL, npmDistTagForChannelAndVersion } from '../../../utils/channel';

import { APPLIED_STRATEGY, Package, STRATEGY } from '../../../utils/package';
import { getNextVersion } from '../../utils/next-version';
import path from 'path';
import semver from 'semver';

const PROJECT_ROOT = process.cwd();

function sortByName(map: Map<string, { name: string }>) {
  const sorted = [...map.values()];
  sorted.sort((a, b) => {
    if (a.name.startsWith('@') && !b.name.startsWith('@')) {
      return 1;
    }

    if (!a.name.startsWith('@') && b.name.startsWith('@')) {
      return -1;
    }
    return a.name > b.name ? 1 : -1;
  });
  map.clear();
  sorted.forEach((v) => {
    map.set(v.name, v);
  });
}

function getPkgDir(pkgFilePath: string) {
  const relative = path.relative(PROJECT_ROOT, pkgFilePath);
  const parts = relative.split('/');
  if (parts.length === 1) {
    return '<root>';
  }
  return '<root>/' + parts[0];
}

export async function applyStrategy(
  config: Map<string, string | number | boolean | null>,
  strategy: STRATEGY,
  baseVersionPackages: Map<string, Package>,
  toPackages: Map<string, Package> = baseVersionPackages
): Promise<AppliedStrategy> {
  const channel = config.get('channel') as CHANNEL;
  const increment = config.get('increment') as 'major' | 'minor' | 'patch';
  const applied_strategies = new Map<string, APPLIED_STRATEGY>();
  const private_pkgs = new Map<string, APPLIED_STRATEGY>();
  const public_pks = new Map<string, APPLIED_STRATEGY>();
  const isReversion = baseVersionPackages !== toPackages;
  const newBaseVersion = baseVersionPackages.get('root')!.pkgData.version;
  const currentVersion = toPackages.get('root')!.pkgData.version;
  // if we are downversioning, then the currentVersion root will have a higher version than the newBaseVersion
  //
  // a downversion occurs when for instance we decide to release a new stable patch from current beta or main
  const isDownversion = isReversion && semver.gt(currentVersion, newBaseVersion);
  if (isDownversion) {
    console.log(
      `\n\n\t==========================================\n\t⚠️\t${chalk.yellow(
        'Down-Versioning Detected:'
      )}\n\t\tConverting primary version from ${chalk.greenBright(currentVersion)} to ${chalk.greenBright(
        newBaseVersion
      )} before applying strategy for ${increment} bump.\n\n\t\tAlpha and Beta packages will be marked as private.\n\t==========================================\n`
    );
  }

  for (const [name, pkg] of toPackages) {
    const rule = strategy.rules[name] || strategy.defaults;
    const applied_strategy = Object.assign({}, rule) as APPLIED_STRATEGY;
    const fromPkg = baseVersionPackages.get(name);

    applied_strategy.name = name;
    applied_strategy.private = Boolean(pkg.pkgData.private);
    applied_strategy.pkgDir = getPkgDir(pkg.filePath);
    applied_strategy.fromVersion = fromPkg ? fromPkg.pkgData.version : pkg.pkgData.version;
    applied_strategy.new = !fromPkg;

    if (isDownversion) {
      // during a downversion, we do not allow publishing a package whose current strategy is
      // alpha or beta.
      // this is because any version bump could conflict with the version in the canary channel.
      // so for instance, if we have canary of an alpha project at 0.0.1-alpha.5,
      // any downversion bump would result in 0.0.1
      // but if we were to downversion the primary version from say 5.4.0-alpha.1 to both 5.3.1 and 5.2.1,
      // then we would have a conflict as both would try to publish the alpha version at 0.0.1
      if (rule.stage === 'alpha' || rule.stage === 'beta') {
        applied_strategy.private = true; // always mark as private to avoid a new publish
        applied_strategy.toVersion = pkg.pkgData.version; // preserve the existing version
        pkg.pkgData.private = true; // mark the package as private, we will save this when applying version changes later
      }

      // handle packages that didn't exist in the fromPackages
      else if (!fromPkg && rule.stage === 'stable') {
        if (pkg.pkgData.version === currentVersion) {
          applied_strategy.fromVersion = newBaseVersion;
        }

        applied_strategy.toVersion = getNextVersion(applied_strategy.fromVersion, channel, increment, rule.stage);
      } else {
        applied_strategy.toVersion = getNextVersion(applied_strategy.fromVersion, channel, increment, rule.stage);
      }
    } else {
      applied_strategy.toVersion = getNextVersion(applied_strategy.fromVersion, channel, increment, rule.stage);
    }

    // channels may not change outside of a major or minor bump
    // major and minor bumps may only occur on beta|canary|release|lts
    // and never lts-* or release-* and so existing fromVersion is safe
    // to use.
    applied_strategy.distTag = npmDistTagForChannelAndVersion(channel, applied_strategy.fromVersion);
    applied_strategies.set(name, applied_strategy);

    applied_strategy.private ? private_pkgs.set(name, applied_strategy) : public_pks.set(name, applied_strategy);
  }

  sortByName(applied_strategies);
  sortByName(private_pkgs);
  sortByName(public_pks);

  return {
    all: applied_strategies,
    private_pkgs,
    public_pks,
  };
}

export type AppliedStrategy = {
  all: Map<string, APPLIED_STRATEGY>;
  private_pkgs: Map<string, APPLIED_STRATEGY>;
  public_pks: Map<string, APPLIED_STRATEGY>;
};
