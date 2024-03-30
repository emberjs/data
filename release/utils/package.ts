import { JSONFile, getFile } from './json-file';
import { NPM_DIST_TAG, SEMVER_VERSION, STRATEGY_TYPE, TYPE_STRATEGY } from './channel';
import { Glob } from 'bun';
import path from 'path';
export class Package {
  declare filePath: string;
  declare file: JSONFile<PACKAGEJSON>;
  declare pkgData: PACKAGEJSON;
  declare tarballPath: string;
  declare mirrorTarballPath: string;
  declare typesTarballPath: string;

  constructor(filePath: string, file: JSONFile<PACKAGEJSON>, pkgData: PACKAGEJSON) {
    this.filePath = filePath;
    this.file = file;
    this.pkgData = pkgData;
    this.tarballPath = '';
    this.mirrorTarballPath = '';
    this.typesTarballPath = '';
  }

  async refresh() {
    await this.file.invalidate();
    this.pkgData = await this.file.read();
  }
}

/**
 * A valid package.json file can go up to 3 levels deep
 * when defining the exports field.
 *
 * ```
 * {
 *  "exports": {
 *    ".": "./index.js",
 *    "main": {
 *      "import": "./index.js",
 *      "require": "./index.js"
 *      "browser": {
 *         "import": "./index.js",
 *         "require": "./index.js"
 *      }
 *     }
 *   }
 * }
 * ```
 *
 * @internal
 */
type ExportConfig = Record<string, string | Record<string, string | Record<string, string>>>;

export type PACKAGEJSON = {
  name: string;
  version: SEMVER_VERSION;
  private: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  files?: string[];
  exports?: ExportConfig;
  'ember-addon'?: {
    main?: 'addon-main.js';
    type?: 'addon';
    version?: 1 | 2;
  };
  author?: string;
  license?: string;
  repository?: {
    type: string;
    url: string;
    directory?: string;
  };
};

export type APPLIED_STRATEGY = {
  name: string;
  private: boolean;
  stage: STRATEGY_TYPE;
  types: TYPE_STRATEGY;
  mirrorPublish: boolean;
  mirrorPublishTo: string;
  typesPublish: boolean;
  typesPublishTo: string;
  fromVersion: SEMVER_VERSION;
  toVersion: SEMVER_VERSION;
  distTag: NPM_DIST_TAG;
  pkgDir: string;
  new: boolean;
};

export interface STRATEGY {
  config: {
    packageRoots: string[];
    changelogRoots?: string[];
    changelog?: {
      collapseLabels?: {
        labels: string[];
        title: string;
      };
      labelOrder?: string[];
      mappings: Record<string, string | null>;
    };
  };
  defaults: {
    stage: STRATEGY_TYPE;
    types: TYPE_STRATEGY;
    mirrorPublish?: boolean;
    typesPublish?: boolean;
  };
  rules: Record<
    string,
    {
      stage: STRATEGY_TYPE;
      types: TYPE_STRATEGY;
      mirrorPublish?: boolean;
      typesPublish?: boolean;
    }
  >;
}

function buildGlob(dirPath: string) {
  return `${dirPath}/package.json`;
}

export async function gatherPackages(config: STRATEGY['config'], cwd: string = process.cwd()) {
  const packages: Map<string, Package> = new Map();

  // add root
  const rootFilePath = `${cwd}/package.json`;
  const rootFile = getFile<PACKAGEJSON>(rootFilePath);
  const rootPkgData = await rootFile.read();
  packages.set('root', new Package(rootFilePath, rootFile, rootPkgData));

  // add other packages
  for (const dirPath of config.packageRoots) {
    const glob = new Glob(buildGlob(dirPath));

    // Scans the current working directory and each of its sub-directories recursively
    for await (const filePath of glob.scan(cwd)) {
      const file = getFile<PACKAGEJSON>(path.join(cwd, filePath));
      const pkgData = await file.read();
      packages.set(pkgData.name, new Package(filePath, file, pkgData));
    }
  }

  return packages;
}

export async function loadStrategy(cwd: string = process.cwd()) {
  const file = getFile<STRATEGY>(`${cwd}/release/strategy.json`);
  const data = await file.read();
  return data;
}
