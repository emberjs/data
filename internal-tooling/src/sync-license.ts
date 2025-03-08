#! /usr/bin/env bun

import path from 'path';
import fs from 'fs';
import debug from 'debug';
import chalk from 'chalk';
import type { BunFile } from 'bun';
import { getMonorepoRoot, getPackageJson } from './-utils';

const log = debug('wd:sync-license');

async function updatePackageJson({ pkg, file, nicePath }: { pkg: any; file: BunFile; path: string; nicePath: string }) {
  let edited = false;
  // ensure "files" field in package.json includes "LICENSE.md"
  if (!pkg.files) {
    pkg.files = ['LICENSE.md'];
    edited = true;
    log(`\t\t📝 Added "LICENSE.md" to "files" in ${nicePath}`);
  } else if (!pkg.files.includes('LICENSE.md')) {
    pkg.files.push('LICENSE.md');
    edited = true;
    log(`\t\t📝 Added "LICENSE.md" to "files" in ${nicePath}`);
  }

  if (pkg.license !== 'MIT') {
    pkg.license = 'MIT';
    edited = true;
    log(`\t\t⚖️ Updated "license" to "MIT" in ${nicePath}`);
  }

  if (edited) {
    await file.write(JSON.stringify(pkg, null, 2));
  }
}

async function main() {
  log(
    `\n\t${chalk.gray('=').repeat(60)}\n\t\t${chalk.magentaBright('@warp-drive/')}${chalk.greenBright('internal-tooling')} Sync LICENSE.md\n\t${chalk.gray('=').repeat(60)}\n\n\t\t${chalk.gray(`Syncing LICENSE.md from monorepo root to each public package`)}\n\n`
  );
  const monorepoRoot = await getMonorepoRoot();

  // sync the LICENSE.md file from the monorepo root to each
  // public package

  const licenseFilePath = path.join(monorepoRoot, 'LICENSE.md');
  const packagesDir = path.join(monorepoRoot, 'packages');

  for (const packageDir of fs.readdirSync(packagesDir)) {
    const details = await getPackageJson({ packageDir, packagesDir });

    if (details.pkg.private) {
      log(`\t\t🔒 Skipping private package ${details.nicePath}`);
      continue;
    }

    const packageFullDir = path.join(packagesDir, packageDir);
    const packageLicensePath = path.join(packageFullDir, 'LICENSE.md');

    // remove th existing LICENSE.md file if it exists
    if (fs.existsSync(packageLicensePath)) {
      fs.rmSync(packageLicensePath);
      log(`\t\t💨 Deleted existing LICENSE.md in ${packageDir}`);
    }

    fs.copyFileSync(licenseFilePath, packageLicensePath);
    log(`\t\t⚖️ Copied LICENSE.md to ${packageDir}`);

    await updatePackageJson(details);

    log('\n');
  }
}

main();
