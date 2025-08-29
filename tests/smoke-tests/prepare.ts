import { gatherPackages } from '../../tools/release/utils/package.ts';
import { generatePackageTarballs } from '../../tools/release/core/publish/steps/generate-tarballs.ts';
import strategyFile from '../../tools/release/strategy.json' assert { type: 'json' };
/**
 * We don't test types for these packages
 * (they also don't end up in the browser)
 */
const IGNORED_PACKAGES = new Set(['@ember-data/codemods', 'eslint-plugin-warp-drive', 'warp-drive']);

export async function buildAll() {
  /**
   * Simulates part of an actual release
   * The version increment doesn't matter, as we aren't actually going to change the versions
   */
  const config = new Map([
    ['channel', 'alpha'],
    ['increment', 'patch'],
  ]);

  /*
   * During actual publish, the whole strategy file is passed here for convinience,
   * but we don't need all of it for the tests
   */
  const packages = await gatherPackages({
    packageRoots: ['packages/*', 'tests/*', 'tools/*', 'warp-drive-packages/*'],
  });

  const strategy = new Map();
  for (let [pkgName, config] of packages.entries()) {
    if (config.pkgData.private) continue;
    if (IGNORED_PACKAGES.has(config.pkgData.name)) continue;

    strategy.set(pkgName, {
      ...strategyFile.defaults,
      ...strategyFile.rules[pkgName],
      name: config.pkgData.name,
      private: false,
      disttag: 'alpha',
    });
  }

  await generatePackageTarballs(config, packages, strategy);
}

if (process.argv[1] === import.meta.filename) {
  await buildAll();
}
