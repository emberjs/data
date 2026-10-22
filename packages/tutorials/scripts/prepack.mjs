// Writes the files each app needs in the published package: its package.json
// without the dependencies (the root package.json holds them, pinned at pack
// time), and its .gitignore as `gitignore`, since npm drops .gitignore files.
// `--clean` removes them again, after packing.
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clean = process.argv.includes('--clean');
const root = fileURLToPath(new URL('..', import.meta.url));
for (const tutorial of readdirSync(root)) {
  for (const app of ['starter', 'solution']) {
    const dir = join(root, tutorial, app);
    if (!existsSync(join(dir, 'package.json'))) continue;
    if (clean) {
      rmSync(join(dir, 'package.template.json'), { force: true });
      rmSync(join(dir, 'gitignore'), { force: true });
      continue;
    }
    const { name, dependencies, devDependencies, ...rest } = JSON.parse(
      readFileSync(join(dir, 'package.json'), 'utf8')
    );
    const template = {
      ...rest,
      dependencies: Object.keys(dependencies ?? {}),
      devDependencies: Object.keys(devDependencies ?? {}),
    };
    writeFileSync(join(dir, 'package.template.json'), `${JSON.stringify(template, null, 2)}\n`);
    copyFileSync(join(dir, '.gitignore'), join(dir, 'gitignore'));
  }
}
