import { gatherPackages } from '../../release/utils/package.ts';
import { generatePackageTarballs } from '../../release/core/publish/steps/generate-tarballs.ts';

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
  const packages = await gatherPackages({ packageRoots: ['packages/*', 'tests/*', 'config'] });

  /**
   * The applied stategy is mostly based off release/strategy.json
   * We want to change it dynamically for our test using the "tag"
   *
   * It's lies, as we're not changing the versions, but the release / build
   * code has different behavior based on channel
   */
  const strategy = new Map();
  for (let [pkgName, config] of packages.entries()) {
    if (config.pkgData.private) continue;
    if (IGNORED_PACKAGES.has(config.pkgData.name)) continue;

    strategy.set(pkgName, {
      stage: 'alpha',
      types: 'alpha',
      typesPublish: true,
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
