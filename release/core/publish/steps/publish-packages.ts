import chalk from 'chalk';
import { APPLIED_STRATEGY, Package } from '../../../utils/package';
import { question } from './confirm-strategy';
import { exec } from '../../../utils/cmd';
import { updateDistTag } from '../../promote';

export async function publishPackages(
  config: Map<string, string | number | boolean | null>,
  packages: Map<string, Package>,
  strategy: Map<string, APPLIED_STRATEGY>
) {
  const NODE_AUTH_TOKEN = process.env.NODE_AUTH_TOKEN;
  const CI = process.env.CI;
  let token: string | undefined;

  // allow OTP token usage locally
  if (!NODE_AUTH_TOKEN) {
    if (CI) {
      console.log(
        chalk.red(
          '🚫 NODE_AUTH_TOKEN not found in ENV. NODE_AUTH_TOKEN is required in ENV to publish from CI. Exiting...'
        )
      );
      process.exit(1);
    }
    token = await getOTPToken(config);
  } else {
    if (!CI) {
      const result = await question(
        `\n${chalk.cyan('NODE_AUTH_TOKEN')} found in ENV.\nPublish ${config.get('increment')} release in ${config.get(
          'channel'
        )} channel to the ${config.get('tag')} tag on the npm registry? ${chalk.yellow('[y/n]')}:`
      );
      const input = result.trim().toLowerCase();
      if (input !== 'y' && input !== 'yes') {
        console.log(chalk.red('🚫 Publishing not confirmed. Exiting...'));
        process.exit(1);
      }
    }
  }

  let publishCount = 0;
  let error: Error | null = null;
  const errors: Error[] = [];
  for (const [, strat] of strategy) {
    const pkg = packages.get(strat.name)!;
    [token, error] = await publishPackage(
      config,
      strat.distTag,
      pkg.tarballPath,
      config.get('dry_run') as boolean,
      token
    );
    if (error) {
      console.log(chalk.red(`\t🚫 Error publishing ${chalk.cyan(pkg.pkgData.name)} to npm: ${error.message}`));
      errors.push(error);
      continue;
    }
    publishCount++;

    if (strat.stage === 'alpha' || strat.stage === 'beta') {
      [token, error] = await updateDistTag(
        strat.name,
        pkg.pkgData.version,
        'latest',
        config.get('dry_run') as boolean,
        token
      );
      if (error) {
        console.log(
          chalk.red(`\t🚫 Error updating dist-tag for ${chalk.cyan(pkg.pkgData.name)} to latest: ${error.message}`)
        );
        errors.push(error);
      }
    }

    if (strat.mirrorPublish) {
      [token, error] = await publishPackage(
        config,
        strat.distTag,
        pkg.mirrorTarballPath,
        config.get('dry_run') as boolean,
        token
      );
      if (error) {
        console.log(
          chalk.red(`\t🚫 Error publishing ${chalk.cyan(pkg.pkgData.name)} <Mirror Package> to npm: ${error.message}`)
        );
        errors.push(error);
        continue;
      }
      publishCount++;

      if (strat.stage === 'alpha' || strat.stage === 'beta') {
        [token, error] = await updateDistTag(
          strat.mirrorPublishTo,
          pkg.pkgData.version,
          'latest',
          config.get('dry_run') as boolean,
          token
        );
        if (error) {
          console.log(
            chalk.red(
              `\t🚫 Error updating dist-tag for ${chalk.cyan(pkg.pkgData.name)} <Mirror Package> to latest: ${error.message}`
            )
          );
          errors.push(error);
        }
      }
    }
    if (strat.typesPublish) {
      [token, error] = await publishPackage(
        config,
        strat.distTag,
        pkg.typesTarballPath,
        config.get('dry_run') as boolean,
        token
      );
      if (error) {
        console.log(
          chalk.red(`\t🚫 Error publishing ${chalk.cyan(pkg.pkgData.name)} <Types Package> to npm: ${error.message}`)
        );
        errors.push(error);
        continue;
      }
      publishCount++;

      if (strat.stage === 'alpha' || strat.stage === 'beta') {
        [token, error] = await updateDistTag(
          strat.typesPublishTo,
          pkg.pkgData.version,
          'latest',
          config.get('dry_run') as boolean,
          token
        );
        if (error) {
          console.log(
            chalk.red(`\t🚫 Error updating dist-tag for ${chalk.cyan(pkg.pkgData.name)} to latest: ${error.message}`)
          );
          errors.push(error);
        }
      }
    }
  }

  console.log(`✅ ` + chalk.cyan(`published ${chalk.greenBright(publishCount)} 📦 packages to npm`));
  if (errors.length > 0) {
    console.log(chalk.red(`🚫 ${errors.length} errors occurred while publishing packages to npm`));
    for (const error of errors) {
      console.log(chalk.red(error.message));
    }
    throw new Error(`${errors.length} errors occurred while publishing packages to npm.`);
  }
}

export async function getOTPToken(config: Map<string, string | number | boolean | null>, reprompt?: boolean) {
  const prompt = reprompt
    ? `The provided OTP token has expired. Please enter a new OTP token: `
    : `\nℹ️ ${chalk.cyan(
        'NODE_AUTH_TOKEN'
      )} not found in ENV.\n\nConfiguring NODE_AUTH_TOKEN is the preferred mechanism by which to publish. Alternatively you may continue using an OTP token.\n\nPublishing ${config.get(
        'increment'
      )} release in ${config.get('channel')} channel to the ${config.get(
        'tag'
      )} tag on the npm registry.\n\nEnter your OTP token: `;

  let token = await question(prompt);

  return token.trim();
}

async function publishPackage(
  config: Map<string, string | number | boolean | null>,
  distTag: string,
  tarball: string,
  dryRun: boolean,
  otp?: string
): Promise<[string | undefined, Error | null]> {
  let cmd = `npm publish ${tarball} --tag=${distTag} --access=public`;

  if (otp) {
    cmd += ` --otp=${otp}`;
  }

  if (dryRun) {
    cmd += ' --dry-run';
  }

  try {
    await exec({ cmd, condense: true });
  } catch (e: unknown) {
    const error = !(e instanceof Error) ? new Error(e as string) : e;
    if (otp) {
      if (error.message.includes('E401') || error.message.includes('EOTP')) {
        otp = await getOTPToken(config, true);
        return publishPackage(config, distTag, tarball, dryRun, otp);
      }
    }
    return [otp, error];
  }

  return [otp, null];
}
