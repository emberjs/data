import chalk from 'chalk';
import { APPLIED_STRATEGY, Package } from '../../utils/package';
import { question } from './confirm-strategy';
import { exec } from '../../../utils/cmd';

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

  for (const [, strat] of strategy) {
    const pkg = packages.get(strat.name)!;
    token = await publishPackage(config, strat.distTag, pkg.tarballPath, config.get('dry_run') as boolean, token);
  }

  console.log(`✅ ` + chalk.cyan(`published ${chalk.greenBright(strategy.size)} 📦 packages to npm`));
}

async function getOTPToken(config: Map<string, string | number | boolean | null>, reprompt?: boolean) {
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
): Promise<string | undefined> {
  let cmd = `npm publish ${tarball} --tag=${distTag} --access=public`;

  if (otp) {
    cmd += ` --otp=${otp}`;
  }

  if (dryRun) {
    cmd += ' --dry-run';
  }

  try {
    await exec({ cmd, condense: true });
  } catch (e) {
    if (!otp || !(e instanceof Error)) {
      throw e;
    }
    if (e.message.includes('E401') || e.message.includes('EOTP')) {
      otp = await getOTPToken(config, true);
      return publishPackage(config, distTag, tarball, dryRun, otp);
    } else {
      throw e;
    }
  }

  return otp;
}
