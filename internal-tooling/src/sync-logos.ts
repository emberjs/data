#! /usr/bin/env bun

import path from 'path';
import fs from 'fs';
import debug from 'debug';
import chalk from 'chalk';
import type { BunFile } from 'bun';
import { getMonorepoRoot, getPackageJson } from './-utils';

const log = debug('wd:sync-logos');

async function copyFiles({
  packageDir,
  packageLogosDir,
  logosDir,
  isCopied,
}: {
  packageDir: string;
  packageLogosDir: string;
  logosDir: string;
  isCopied: boolean;
}) {
  // if we are in copy mode, remove any existing symlink and copy the files
  if (isCopied) {
    fs.rmSync(packageLogosDir, { recursive: true, force: true });
    log(`\t\t\t🗑️ Deleted existing copy of ${packageDir}/logos`);
  }
  fs.mkdirSync(packageLogosDir, { recursive: true });
  log(`\t\t\t📁 Created ${packageDir}/logos`);

  for (const logo of fs.readdirSync(logosDir, { recursive: true, encoding: 'utf-8' })) {
    const logoPath = path.join(logosDir, logo);
    const destPath = path.join(packageLogosDir, logo);
    fs.copyFileSync(logoPath, destPath);
    log(`\t\t\t📁 Copied ${logo} to ${packageDir}/logos`);
  }
}

async function updatePackageJson({ pkg, file, nicePath }: { pkg: any; file: BunFile; path: string; nicePath: string }) {
  // ensure "files" field in package.json includes "logos"
  if (!pkg.files) {
    pkg.files = ['logos'];
    await file.write(JSON.stringify(pkg, null, 2));
    log(`\t\t📝 Added "logos" to "files" in ${nicePath}`);
  } else if (!pkg.files.includes('logos')) {
    pkg.files.push('logos');
    await file.write(JSON.stringify(pkg, null, 2));
    log(`\t\t📝 Added "logos" to "files" in ${nicePath}`);
  }
}

async function main() {
  log(
    `\n\t${chalk.gray('=').repeat(60)}\n\t\t${chalk.magentaBright('@warp-drive/')}${chalk.greenBright('internal-tooling')} Sync Logos\n\t${chalk.gray('=').repeat(60)}\n\n\t\t${chalk.gray(`Syncing logo files from monorepo root to each public package`)}\n\n`
  );
  const monorepoRoot = await getMonorepoRoot();

  // sync the logos from the monorepo root to each
  // package directory that has a logos directory

  const logosDir = path.join(monorepoRoot, 'logos');
  const packagesDir = path.join(monorepoRoot, 'packages');

  for (const packageDir of fs.readdirSync(packagesDir)) {
    const packageLogosDir = path.join(packagesDir, packageDir, 'logos');
    const isCopied = fs.existsSync(packageLogosDir);
    const details = await getPackageJson({ packageDir, packagesDir });

    if (details.pkg.private) {
      log(`\t\t🔒 Skipping private package ${details.nicePath}`);
      continue;
    }

    log(`\t\t🔁 Syncing logos to ${packageDir}`);

    await copyFiles({
      packageDir,
      packageLogosDir,
      logosDir,
      isCopied,
    });

    await updatePackageJson(details);
  }
}

main();
