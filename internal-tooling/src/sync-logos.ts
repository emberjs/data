#! /usr/bin/env bun

import path from 'path';
import fs from 'fs';
import debug from 'debug';
import chalk from 'chalk';
import type { BunFile } from 'bun';

const log = debug('wd:sync-logos');

async function getMonorepoRoot() {
  const MAX_DEPTH = 10;
  // are we in the root?
  let currentDir = process.cwd();
  let depth = 0;
  while (depth < MAX_DEPTH) {
    const lockfileFile = path.join(currentDir, 'pnpm-lock.yaml');
    if (await Bun.file(lockfileFile).exists()) {
      return currentDir;
    }
    currentDir = path.join(currentDir, '../');
    depth++;
  }

  throw new Error(`Could not find monorepo root from cwd ${process.cwd()}`);
}

function isDirectorySymlink(dirPath: string) {
  try {
    const stats = fs.lstatSync(dirPath);
    return stats.isSymbolicLink();
  } catch (error) {
    return false;
  }
}

async function copyFiles({
  packageDir,
  packageLogosDir,
  logosDir,
  isLinked,
  isCopied,
}: {
  packageDir: string;
  packageLogosDir: string;
  logosDir: string;
  isLinked: boolean;
  isCopied: boolean;
}) {
  // if we are in copy mode, remove any existing symlink and copy the files
  if (isLinked) {
    fs.unlinkSync(packageLogosDir);
    log(`\t\t\t🗑️ Deleted existing symlink for ${packageDir}/logos`);
  } else if (isCopied) {
    fs.rmSync(packageLogosDir, { recursive: true, force: true });
    log(`\t\t\t🗑️ Deleted existing non-symlinked version of ${packageDir}/logos`);
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

async function symlinkFiles({
  packageDir,
  packageLogosDir,
  logosDir,
  isLinked,
  isCopied,
}: {
  packageDir: string;
  packageLogosDir: string;
  logosDir: string;
  isLinked: boolean;
  isCopied: boolean;
}) {
  // if we are in symlink mode, symlink if none is present.
  // if one is present, do nothing
  // if what is present is not a symlink, remove it and symlink
  if (isLinked) {
    log(`\t\t\t🔗 Symlink already exists for ${packageDir}/logos`);
    return;
  } else if (isCopied) {
    fs.rmSync(packageLogosDir, { recursive: true, force: true });
    log(`\t\t\t🗑️ Deleted existing non-symlinked version of ${packageDir}/logos`);
  }

  const source = packageLogosDir;
  const target = path.relative(source, logosDir);
  fs.symlinkSync(target, source, 'junction');
  log(`\t\t\t🔗 Symlinked ${logosDir} to ${packageDir}/logos`);
}

async function getPackageJson({ packageDir, packagesDir }: { packageDir: string; packagesDir: string }) {
  const packageJsonPath = path.join(packagesDir, packageDir, 'package.json');
  const packageJsonFile = Bun.file(packageJsonPath);
  const pkg = await packageJsonFile.json();
  return { file: packageJsonFile, pkg, path: packageJsonPath, nicePath: path.join(packageDir, 'package.json') };
}

async function updatePackageJson({
  pkg,
  file,
  path,
  nicePath,
}: {
  pkg: any;
  file: BunFile;
  path: string;
  nicePath: string;
}) {
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
  const copyLogos = process.argv.includes('--copy');

  log(
    `\n\t${chalk.gray('=').repeat(60)}\n\t\t${chalk.magentaBright('@warp-drive/')}${chalk.greenBright('internal-tooling')} Sync Logos\n\t${chalk.gray('=').repeat(60)}\n\n\t\t${chalk.gray(`Syncing logo files via ${chalk.yellow(copyLogos ? 'copy' : 'symlink')} from monorepo root to each package`)}\n\n`
  );
  const monorepoRoot = await getMonorepoRoot();

  // sync the logos from the monorepo root to each
  // package directory that has a logos directory

  const logosDir = path.join(monorepoRoot, 'logos');
  const packagesDir = path.join(monorepoRoot, 'packages');

  for (const packageDir of fs.readdirSync(packagesDir)) {
    const packageLogosDir = path.join(packagesDir, packageDir, 'logos');
    const isLinked = isDirectorySymlink(packageLogosDir);
    const isCopied = !isLinked && fs.existsSync(packageLogosDir);
    const details = await getPackageJson({ packageDir, packagesDir });

    if (details.pkg.private) {
      log(`\t\t🔒 Skipping private package ${details.nicePath}`);
      continue;
    }

    log(`\t\t🔁 Syncing logos to ${packageDir}`);

    if (!copyLogos) {
      await symlinkFiles({
        packageDir,
        packageLogosDir,
        logosDir,
        isLinked,
        isCopied,
      });
    } else {
      await copyFiles({
        packageDir,
        packageLogosDir,
        logosDir,
        isLinked,
        isCopied,
      });
    }

    await updatePackageJson(details);
  }
}

main();
