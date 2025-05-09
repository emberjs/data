/*
  Symlinks the guides folder to docs.warp-drive.io/guides
*/
import { join } from 'path';
import { symlinkSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';

async function main() {
  const guidesPath = join(__dirname, '../../guides');
  const symlinkPath = join(__dirname, '../docs.warp-drive.io/guides');

  // use Bun to create the symlink if it doesn't exist

  if (existsSync(symlinkPath)) {
    return;
  }

  try {
    if (process.env.CI) {
      // in CI we do a copy instead of a symlink
      // because the symlink will not work in the CI environment
      // and we don't want to fail the build
      spawnSync('cp', ['-r', guidesPath, symlinkPath], {
        stdio: 'inherit',
        cwd: __dirname,
      });
      console.log(`Copied: ${guidesPath} -> ${symlinkPath}`);
    } else {
      symlinkSync(guidesPath, symlinkPath);
      console.log(`Symlink created: ${guidesPath} -> ${symlinkPath}`);
    }
  } catch (error) {
    console.error('Error creating symlink:', error);
  }
}

main();
