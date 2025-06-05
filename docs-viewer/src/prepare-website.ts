/*
  Symlinks the guides folder to docs.warp-drive.io/guides
*/
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import { spawnSync } from 'child_process';

export async function main() {
  const guidesPath = join(__dirname, '../../guides');
  const contributingPath = join(__dirname, '../../contributing');
  const copiedPath = join(__dirname, '../docs.warp-drive.io/guides');
  const copiedContributingPath = join(__dirname, '../docs.warp-drive.io/guides/contributing');

  // use Bun to create the symlink if it doesn't exist

  if (existsSync(copiedPath)) {
    // remove the symlink if it exists
    rmSync(copiedPath, { recursive: true, force: true });
  }

  try {
    spawnSync('cp', ['-r', guidesPath, copiedPath], {
      stdio: 'inherit',
      cwd: __dirname,
    });
    console.log(`Copied: ${guidesPath} -> ${copiedPath}`);
  } catch (error) {
    console.error('Error copying directory:', error);
  }

  try {
    spawnSync('cp', ['-r', contributingPath, copiedContributingPath], {
      stdio: 'inherit',
      cwd: __dirname,
    });
    console.log(`Copied: ${contributingPath} -> ${copiedContributingPath}`);
  } catch (error) {
    console.error('Error copying directory:', error);
  }
}

main();
