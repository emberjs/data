#! usr/bin/env bun

import path from 'path';
import fs from 'fs';

function getMonorepoRoot() {
  return path.resolve(__dirname, '../..');
}

async function main() {
  const monorepoRoot = getMonorepoRoot();

  // sync the logos from the monorepo root to each
  // package directory that has a logos directory

  const logosDir = path.resolve(monorepoRoot, 'logos');
  const packagesDir = path.resolve(monorepoRoot, 'packages');

  for (const packageDir of fs.readdirSync(packagesDir)) {
    const packageLogosDir = path.resolve(packageDir, 'logos');
    console.log(`Syncing logos to ${packageLogosDir}`);
    fs.rmdirSync(packageLogosDir, { recursive: true });
    fs.mkdirSync(packageLogosDir, { recursive: true });

    for (const logo of fs.readdirSync(logosDir)) {
      const logoPath = path.resolve(logosDir, logo);
      const destPath = path.resolve(packageLogosDir, logo);
      fs.copyFileSync(logoPath, destPath);
    }

    // ensure "files" field in package.json includes "logos"
    const packageJsonPath = path.resolve(packageDir, 'package.json');
    const packageJsonFile = Bun.file(packageJsonPath);
    const pkg = await packageJsonFile.json();
    if (!pkg.files.includes('logos')) {
      pkg.files.push('logos');
      await packageJsonFile.write(JSON.stringify(pkg, null, 2));
    }
  }
}

main();
