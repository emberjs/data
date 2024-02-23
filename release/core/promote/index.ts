import { promote_flags_config } from '../../utils/flags-config';
import { parseRawFlags } from '../../utils/parse-args';
import { GIT_TAG, getAllPackagesForGitTag, getGitState, pushLTSTagToRemoteBranch } from '../../utils/git';
import { printHelpDocs } from '../../help/docs';
import { Package } from '../../utils/package';
import { SEMVER_VERSION } from '../../utils/channel';
import chalk from 'chalk';
import { colorName } from '../publish/steps/print-strategy';
import { exec } from '../../utils/cmd';
import { question } from '../publish/steps/confirm-strategy';

export async function promoteToLTS(args: string[]) {
  // get user supplied config
  const config = await parseRawFlags(args.slice(1), promote_flags_config);
  const gitTag: GIT_TAG = `v${config.full.get('version') as SEMVER_VERSION}`;

  if (config.full.get('help')) {
    return printHelpDocs(args);
  }

  const packages = await getAllPackagesForGitTag(gitTag);
  const versionsToPromote = getPublicPackageVersions(packages);

  await updateTags(config.full, versionsToPromote);
  if (config.full.get('upstream') && !config.full.get('dry_run')) {
    try {
      await pushLTSTagToRemoteBranch(gitTag, true);
    } catch (e) {
      console.error(chalk.red(`NPM Tag Updated, but failed to update the remote lts branch for ${gitTag}`));
      console.error(e);
    }
  }
}

export function getPublicPackageVersions(packages: Map<string, Package>): Map<string, SEMVER_VERSION> {
  const publicPackages = new Map<string, SEMVER_VERSION>();
  packages.forEach((pkg, name) => {
    if (!pkg.pkgData.private) {
      publicPackages.set(name, pkg.pkgData.version);
    }
  });
  return publicPackages;
}

export async function updateTags(
  config: Map<string, string | number | boolean | null>,
  packages: Map<string, SEMVER_VERSION>
) {
  const distTag = config.get('tag') as string;
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
    token = await getOTPToken(distTag);
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

  const dryRun = config.get('dry_run') as boolean;

  for (const [pkgName, version] of packages) {
    token = await updateDistTag(pkgName, version, distTag, dryRun, token);
    console.log(chalk.green(`\t✅ ${colorName(pkgName)} ${chalk.green(version)} => ${chalk.magenta(distTag)}`));
  }

  console.log(
    `✅ ` + chalk.cyan(`Moved ${chalk.greenBright(packages.size)} 📦 packages to ${chalk.magenta(distTag)} channel`)
  );
}

async function getOTPToken(distTag: string, reprompt?: boolean) {
  const prompt = reprompt
    ? `The provided OTP token has expired. Please enter a new OTP token: `
    : `\nℹ️ ${chalk.cyan(
        'NODE_AUTH_TOKEN'
      )} not found in ENV.\n\nConfiguring NODE_AUTH_TOKEN is the preferred mechanism by which to publish. Alternatively you may continue using an OTP token.\n\nUpdating ${distTag} tag on the npm registry.\n\nEnter your OTP token: `;

  let token = await question(prompt);

  return token.trim();
}

async function updateDistTag(
  pkg: string,
  version: string,
  distTag: string,
  dryRun: boolean,
  otp?: string
): Promise<string | undefined> {
  let cmd = `npm dist-tag add ${pkg}@${version} ${distTag}`;

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
      otp = await getOTPToken(distTag, true);
      return updateDistTag(pkg, version, distTag, dryRun, otp);
    } else {
      throw e;
    }
  }

  return otp;
}
