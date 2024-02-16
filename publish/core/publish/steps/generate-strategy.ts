import { getFile } from '../../../utils/json-file';
import { GIT_STATE } from '../../../utils/git';
import { STRATEGY_TYPE, CHANNEL, npmDistTagForChannelAndVersion, TYPE_STRATEGY } from '../../../utils/channel';
import { Glob } from 'bun';
import { APPLIED_STRATEGY, PACKAGEJSON, Package } from '../../utils/package';
import { getNextVersion } from '../../utils/next-version';
import path from 'path';

const PROJECT_ROOT = process.cwd();

export interface STRATEGY {
  config: {
    packageRoots: string[];
  };
  defaults: {
    stage: STRATEGY_TYPE;
    types: TYPE_STRATEGY;
  };
  rules: Record<
    string,
    {
      stage: STRATEGY_TYPE;
      types: TYPE_STRATEGY;
    }
  >;
}

function buildGlob(dirPath: string) {
  return `${dirPath}/package.json`;
}

export async function gatherPackages(config: STRATEGY['config']) {
  const packages: Map<string, Package> = new Map();

  // add root
  const rootFilePath = `${process.cwd()}/package.json`;
  const rootFile = getFile<PACKAGEJSON>(rootFilePath);
  const rootPkgData = await rootFile.read();
  packages.set('root', new Package(rootFilePath, rootFile, rootPkgData));

  // add other packages
  for (const dirPath of config.packageRoots) {
    const glob = new Glob(buildGlob(dirPath));

    // Scans the current working directory and each of its sub-directories recursively
    for await (const filePath of glob.scan('.')) {
      const file = getFile<PACKAGEJSON>(filePath);
      const pkgData = await file.read();
      packages.set(pkgData.name, new Package(filePath, file, pkgData));
    }
  }

  return packages;
}

export async function loadStrategy() {
  const file = getFile<STRATEGY>(`${PROJECT_ROOT}/publish/strategy.json`);
  const data = await file.read();
  return data;
}

function sortByName(map: Map<string, { name: string }>) {
  const sorted = [...map.values()];
  sorted.sort((a, b) => {
    if (a.name.startsWith('@') && !b.name.startsWith('@')) {
      return 1;
    }

    if (!a.name.startsWith('@') && b.name.startsWith('@')) {
      return -1;
    }
    return a.name > b.name ? 1 : -1;
  });
  map.clear();
  sorted.forEach((v) => {
    map.set(v.name, v);
  });
}

function getPkgDir(pkgFilePath: string) {
  const relative = path.relative(PROJECT_ROOT, pkgFilePath);
  const parts = relative.split('/');
  if (parts.length === 1) {
    return '<root>';
  }
  return '<root>/' + parts[0];
}

export async function applyStrategy(
  config: Map<string, string | number | boolean | null>,
  gitInfo: GIT_STATE,
  strategy: STRATEGY,
  packages: Map<string, Package>
): Promise<AppliedStrategy> {
  const channel = config.get('channel') as CHANNEL;
  const increment = config.get('increment') as 'major' | 'minor' | 'patch';
  const applied_strategies = new Map<string, APPLIED_STRATEGY>();
  const private_pkgs = new Map<string, APPLIED_STRATEGY>();
  const public_pks = new Map<string, APPLIED_STRATEGY>();

  packages.forEach((pkg, name) => {
    const rule = strategy.rules[name] || strategy.defaults;
    const applied_strategy = Object.assign({}, rule) as APPLIED_STRATEGY;

    applied_strategy.name = name;
    applied_strategy.private = Boolean(pkg.pkgData.private);
    applied_strategy.pkgDir = getPkgDir(pkg.filePath);
    applied_strategy.fromVersion = pkg.pkgData.version;
    applied_strategy.toVersion = getNextVersion(applied_strategy.fromVersion, channel, increment, rule.stage);

    // channels may not change outside of a major or minor bump
    // major and minor bumps may only occur on beta|canary|release|lts
    // and never lts-* or release-* and so existing fromVersion is safe
    // to use.
    applied_strategy.distTag = npmDistTagForChannelAndVersion(channel, applied_strategy.fromVersion);
    applied_strategies.set(name, applied_strategy);

    applied_strategy.private ? private_pkgs.set(name, applied_strategy) : public_pks.set(name, applied_strategy);
  });

  sortByName(applied_strategies);
  sortByName(private_pkgs);
  sortByName(public_pks);

  return {
    all: applied_strategies,
    private_pkgs,
    public_pks,
  };
}

export type AppliedStrategy = {
  all: Map<string, APPLIED_STRATEGY>;
  private_pkgs: Map<string, APPLIED_STRATEGY>;
  public_pks: Map<string, APPLIED_STRATEGY>;
};
