import chalk from 'chalk';
import { exec } from '../../../utils/cmd';
import { APPLIED_STRATEGY, Package } from '../../utils/package';

/**
 * This function will consume the strategy, bump the versions of all packages,
 * and then commit the changes. This includes updating the project lockfile.
 *
 * The changes will be committed with a message of "Release v${nextVersion}"
 * where nextVersion is the version that the root package will be bumped to.
 *
 * The tag `v${nextVersion}` will be created to match.
 *
 * @internal
 */
export async function bumpAllPackages(
  config: Map<string, string | number | boolean | null>,
  packages: Map<string, Package>,
  strategy: Map<string, APPLIED_STRATEGY>
) {
  for (const [, pkg] of packages) {
    const strat = strategy.get(pkg.pkgData.name);
    if (!strat) {
      throw new Error(`Unable to find strategy for package ${pkg.pkgData.name}`);
    }
    pkg.pkgData.version = strat.toVersion;

    // update any referenced packages in dependencies
    bumpKnownProjectVersionsFromStrategy(pkg.pkgData.dependencies || {}, strategy);
    bumpKnownProjectVersionsFromStrategy(pkg.pkgData.devDependencies || {}, strategy);
    bumpKnownProjectVersionsFromStrategy(pkg.pkgData.peerDependencies || {}, strategy);

    await pkg.file.write();
  }

  const willPublish: boolean = config.get('pack') && config.get('publish');
  const dryRun = config.get('dry_run') as boolean;
  const nextVersion = strategy.get('root')?.toVersion;
  let commitCommand = `git commit -am "Release v${nextVersion}"`;

  if (!dryRun) {
    if (willPublish) commitCommand = `pnpm install --no-frozen-lockfile && ` + commitCommand;
    else commitCommand = `pnpm install && ` + commitCommand;
    commitCommand += ` && git tag v${nextVersion}`;
  }

  // Let the github action determine whether to push the tag to remote
  if (!dryRun && config.get('upstream')) {
    commitCommand += ` && git push && git push origin v${nextVersion}`;
  }

  const cleanCommand = willPublish ? `git clean -fdx &&` : '';
  const finalCommand = process.env.CI
    ? ['sh', '-c', `${cleanCommand}${commitCommand}`]
    : ['zsh', '-c', `${cleanCommand}${commitCommand}`];

  await exec(finalCommand, dryRun);
  console.log(`✅ ` + chalk.cyan(`Successfully Versioned ${nextVersion}`));
}

function bumpKnownProjectVersionsFromStrategy(
  deps: Record<string, string>,
  strategy: Map<string, APPLIED_STRATEGY>,
  restore = false
) {
  let changed = false;
  Object.keys(deps).forEach((depName) => {
    const strat = strategy.get(depName);
    if (!strat) {
      return;
    }
    if (deps[depName].startsWith('workspace:')) {
      deps[depName] = `workspace:${restore ? strat.fromVersion : strat.toVersion}`;
      changed = true;
    }
  });
  return changed;
}

export async function restorePackagesForDryRun(
  packages: Map<string, Package>,
  strategy: Map<string, APPLIED_STRATEGY>
) {
  for (const [, pkg] of packages) {
    const strat = strategy.get(pkg.pkgData.name);
    if (!strat) {
      throw new Error(`Unable to find strategy for package ${pkg.pkgData.name}`);
    }
    pkg.pkgData.version = strat.fromVersion;

    // update any referenced packages in dependencies
    bumpKnownProjectVersionsFromStrategy(pkg.pkgData.dependencies || {}, strategy, true);
    bumpKnownProjectVersionsFromStrategy(pkg.pkgData.devDependencies || {}, strategy, true);
    bumpKnownProjectVersionsFromStrategy(pkg.pkgData.peerDependencies || {}, strategy, true);

    await pkg.file.write();
  }

  console.log(`\t♻️ ` + chalk.grey(`Successfully Restored Versions for DryRun`));
}
