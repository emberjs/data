import { JSONFile } from '../../utils/json-file';
import { NPM_DIST_TAG, SEMVER_VERSION, STRATEGY_TYPE, TYPE_STRATEGY } from '../../utils/channel';

export class Package {
  declare filePath: string;
  declare file: JSONFile<PACKAGEJSON>;
  declare pkgData: PACKAGEJSON;
  declare tarballPath: string;

  constructor(filePath: string, file: JSONFile<PACKAGEJSON>, pkgData: PACKAGEJSON) {
    this.filePath = filePath;
    this.file = file;
    this.pkgData = pkgData;
    this.tarballPath = '';
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
};

export type APPLIED_STRATEGY = {
  name: string;
  private: boolean;
  stage: STRATEGY_TYPE;
  types: TYPE_STRATEGY;
  fromVersion: SEMVER_VERSION;
  toVersion: SEMVER_VERSION;
  distTag: NPM_DIST_TAG;
  pkgDir: string;
};
