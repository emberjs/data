/**
 * Sync LICENSE file from the monorepo root to each public package
 * so that it can be included in the published artifacts.
 */
import path from 'path';
import fs from 'fs';
import debug from 'debug';
import chalk from 'chalk';
import { getMonorepoRoot, walkPackages, type ProjectPackage } from './-utils';

const log = debug('wd:sync-license');

async function updatePackageJson(project: ProjectPackage) {
  const { pkg } = project;

  let edited = false;
  // ensure "files" field in package.json includes "LICENSE.md"
  if (!pkg.files) {
    pkg.files = ['LICENSE.md'];
    edited = true;
    log(`\t\t📝 Added "LICENSE.md" to "files" in ${project.project.dir}`);
  } else if (!pkg.files.includes('LICENSE.md')) {
    pkg.files.push('LICENSE.md');
    edited = true;
    log(`\t\t📝 Added "LICENSE.md" to "files" in ${project.project.dir}`);
  }

  if (pkg.license !== 'MIT') {
    pkg.license = 'MIT';
    edited = true;
    log(`\t\t⚖️ Updated "license" to "MIT" in ${project.project.dir}`);
  }

  if (edited) {
    await project.save({ pkgEdited: true, configEdited: false });
  }
}

export async function main() {
  log(
    `\n\t${chalk.gray('=').repeat(60)}\n\t\t${chalk.magentaBright('@warp-drive/')}${chalk.greenBright('internal-tooling')} Sync LICENSE.md\n\t${chalk.gray('=').repeat(60)}\n\n\t\t${chalk.gray(`Syncing LICENSE.md from monorepo root to each public package`)}\n\n`
  );
  const monorepoRoot = await getMonorepoRoot();

  // sync the LICENSE.md file from the monorepo root to each
  // public package

  const licenseFilePath = path.join(monorepoRoot, 'LICENSE.md');

  await walkPackages(async (project: ProjectPackage, projects: Map<string, ProjectPackage>) => {
    if (project.isPrivate) {
      return;
    }

    if (project.pkg.private) {
      log(`\t\t🔒 Skipping private package ${project.project.dir}`);
      return;
    }

    const packageLicensePath = path.join(project.project.dir, 'LICENSE.md');

    // remove th existing LICENSE.md file if it exists
    if (fs.existsSync(packageLicensePath)) {
      fs.rmSync(packageLicensePath);
      log(`\t\t💨 Deleted existing LICENSE.md in ${project.project.dir}`);
    }

    fs.copyFileSync(licenseFilePath, packageLicensePath);
    log(`\t\t⚖️ Copied LICENSE.md to ${project.project.dir}`);

    await updatePackageJson(project);

    log('\n');
  });
}
