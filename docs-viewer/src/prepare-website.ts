/*
  Symlinks the guides folder to docs.warp-drive.io/guides
*/
import { join } from 'path';
import { symlinkSync, existsSync } from 'fs';

async function main() {
  const guidesPath = join(__dirname, '../../guides');
  const symlinkPath = join(__dirname, '../docs.warp-drive.io/guides');

  // use Bun to create the symlink if it doesn't exist

  if (existsSync(symlinkPath)) {
    return;
  }

  try {
    symlinkSync(guidesPath, symlinkPath);
    console.log(`Symlink created: ${guidesPath} -> ${symlinkPath}`);
  } catch (error) {
    console.error('Error creating symlink:', error);
  }
}

main();
