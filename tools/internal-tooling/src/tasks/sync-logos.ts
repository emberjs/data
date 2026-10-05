import debug from 'debug';
import fs from 'fs';
import { styleText } from 'node:util';
/**
 * Sync logos from the monorepo root to each public package
 * for use in README files etc. in published artifacts
 *
 * As well as into docs for use by the docs.
 */
import path from 'path';

import { getMonorepoRoot, walkPackages, type ProjectPackage } from './-utils.ts';

const log = debug('wd:sync-logos');

async function copyFiles({
  packageLogosDir,
  logosDir,
  hasExistingCopy,
}: {
  packageLogosDir: string;
  logosDir: string;
  hasExistingCopy: boolean;
}) {
  if (hasExistingCopy) {
    fs.rmSync(packageLogosDir, { recursive: true, force: true });
    log(`\t\t\t🗑️ Deleted existing copy of ${logosDir}`);
  }
  fs.mkdirSync(packageLogosDir, { recursive: true });
  log(`\t\t\t📁 Created ${packageLogosDir}`);

  for (const logo of fs.readdirSync(logosDir, { recursive: true, encoding: 'utf-8' })) {
    const logoPath = path.join(logosDir, logo);
    const destPath = path.join(packageLogosDir, logo);

    // only copy files (not directories)
    if (fs.lstatSync(logoPath).isDirectory()) {
      // create the directory in the destination
      fs.mkdirSync(destPath, { recursive: true });
      log(`\t\t\t📁 Created directory ${destPath}`);
      continue;
    }
    fs.copyFileSync(logoPath, destPath);
    log(`\t\t\t🌇 Copied ${destPath}`);
  }
}

async function updatePackageJson(project: ProjectPackage) {
  const { pkg } = project;
  // ensure "files" field in package.json includes "logos"
  if (!pkg.files) {
    pkg.files = ['logos'];
    await project.save({ pkgEdited: true, configEdited: false });
    log(`\t\t📝 Added "logos" to "files" in ${project.project.dir}`);
  } else if (!pkg.files.includes('logos')) {
    pkg.files.push('logos');
    await project.save({ pkgEdited: true, configEdited: false });
    log(`\t\t📝 Added "logos" to "files" in ${project.project.dir}`);
  }
}

async function syncLogosForDocs(monorepoRoot: string) {
  log(`\t\t🔁 Syncing logos to Documentation Site`);

  const logosDir = path.join(monorepoRoot, 'logos');
  const packageLogosDir = path.join(monorepoRoot, 'docs-viewer/docs.warp-drive.io/public/logos');
  const hasExistingCopy = fs.existsSync(packageLogosDir);

  await copyFiles({
    packageLogosDir,
    logosDir,
    hasExistingCopy,
  });
}

export async function main() {
  log(
    `\n\t${styleText('gray', '=').repeat(60)}\n\t\t${styleText('magentaBright', '@warp-drive/')}${styleText('greenBright', 'internal-tooling')} Sync Logos\n\t${styleText('gray', '=').repeat(60)}\n\n\t\t${styleText('gray', `Syncing logo files from monorepo root to each public package`)}\n\n`
  );
  const monorepoRoot = await getMonorepoRoot();

  // sync the logos from the monorepo root to each
  // package directory that has a logos directory

  const logosDir = path.join(monorepoRoot, 'logos/synced');

  await walkPackages(async (project: ProjectPackage, projects: Map<string, ProjectPackage>) => {
    if (project.isPrivate && project.pkg.name !== '@warp-drive/diagnostic') {
      log(`\t\t🔒 Skipping private package ${project.pkg.name}`);
      return;
    }
    // The tutorials package ships standalone apps for learners, not a library, so it has no logos.
    if (project.pkg.name === '@warp-drive/tutorials') {
      log(`\t\t🔒 Skipping ${project.pkg.name}`);
      return;
    }

    log(`\t\t🔁 Syncing logos to ${project.project.dir}`);

    const packageLogosDir = path.join(project.project.dir, 'logos');
    const hasExistingCopy = fs.existsSync(packageLogosDir);

    await copyFiles({
      packageLogosDir,
      logosDir,
      hasExistingCopy,
    });

    await updatePackageJson(project);
  });

  await syncLogosForDocs(monorepoRoot);
}
