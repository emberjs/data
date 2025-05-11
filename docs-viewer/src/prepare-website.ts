/*
  Symlinks the guides folder to docs.warp-drive.io/guides
*/
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import { spawnSync } from 'child_process';

export async function main() {
  const guidesPath = join(__dirname, '../../guides');
  const copiedPath = join(__dirname, '../docs.warp-drive.io/guide');

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
}

main();
