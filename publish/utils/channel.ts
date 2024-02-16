import semver from 'semver';

export type LTS_TAG = `lts-${number}-${number}`;
export type RELEASE_TAG = `release-${number}-${number}`;
export type NPM_DIST_TAG = 'latest' | 'beta' | 'canary' | 'lts' | LTS_TAG | RELEASE_TAG;
export type VALID_BRANCHES = 'main' | 'beta' | 'release' | LTS_TAG | RELEASE_TAG;
export type CHANNEL = 'lts' | 'release' | 'beta' | 'canary' | 'lts-prev' | 'release-prev';
export type ALPHA_SEMVER = `${number}.${number}.${number}-alpha.${number}`;
export type BETA_SEMVER = `${number}.${number}.${number}-beta.${number}`;
export type RELEASE_SEMVER = `${number}.${number}.${number}`;
export type SEMVER_VERSION = RELEASE_SEMVER | BETA_SEMVER | ALPHA_SEMVER;
/**
 * The strategy type is used to determine the next version of a package
 * and how to handle types during publish.
 *
 * For Versions
 *
 * - alpha means the project is still unstable and we are working towards a beta
 * - beta means the project is stable but not yet ready for general release
 * - stable means the project is capable of being released for general use
 *
 * See the `next version` function for more details.
 *
 * For Types
 *
 * - private means the project's types are highly unstable and should not be published
 * - alpha means the project's types are stable enough to experiment but not recommended.
 *   Users should expect breaking changes regularly, and must configure their tsconfig
 *   to consume the types. e.g. `"types": ["ember-data/unstable-preview-types"],`
 * - beta means the project's types are stable and can be consumed by the general public
 *   but are not yet ready for general release. e.g. `"types": ["ember-data/types"],`
 * - stable means the project's types are stable and can be consumed by the general public
 *   no special configuration is required to receive these types, they are the default.
 *
 * @internal
 */
export type STRATEGY_TYPE = 'stable' | 'alpha' | 'beta';
export type TYPE_STRATEGY = 'stable' | 'alpha' | 'beta' | 'private';
export type RELEASE_TYPE = 'major' | 'minor' | 'patch';

const RELEASE_BRANCH_REGEXP = /^release\-(\d+)\-(\d+)/;
const LTS_BRANCH_REGEXP = /^lts\-(\d+)\-(\d+)/;

export function channelForBranch(branch: string, currentVersion: SEMVER_VERSION, force: boolean): CHANNEL {
  if (branch === 'main') return 'canary';
  if (branch === 'beta' || branch === 'release' || branch === 'lts') return branch;
  if (RELEASE_BRANCH_REGEXP.test(branch)) return 'release-prev';
  if (LTS_BRANCH_REGEXP.test(branch)) return 'lts-prev';

  if (force) {
    if (currentVersion.includes('beta')) {
      return 'beta';
    }
    if (currentVersion.includes('alpha')) {
      return 'canary';
    }
    // we wouldn't want to treat this as latest
    // unless user is very clear it is
    return 'release-prev';
  }
  throw new Error(`Attempting to release from an unexpected branch ${branch}`);
}

export function npmDistTagForChannelAndVersion(channel: CHANNEL, package_version: SEMVER_VERSION): NPM_DIST_TAG {
  const major = semver.major(package_version);
  const minor = semver.minor(package_version);

  if (major === undefined) {
    throw new Error(`Unable to parse semver major from version ${package_version}`);
  }

  if (minor === undefined) {
    throw new Error(`Unable to parse semver minor from version ${package_version}`);
  }

  switch (channel) {
    case 'beta':
    case 'canary':
    case 'lts':
      return channel;
    case 'release':
      return 'latest';
    case 'lts-prev':
      return `lts-${major}-${minor}`;
    case 'release-prev':
      return `release-${major}-${minor}`;
    default:
      throw new Error(`Unable to determine npm dist-tag for channel ${channel} and version ${package_version}`);
  }
}

export function branchForChannelAndVersion(channel: CHANNEL, package_version: SEMVER_VERSION): VALID_BRANCHES {
  const major = semver.major(package_version);
  const minor = semver.minor(package_version);

  if (major === undefined) {
    throw new Error(`Unable to parse semver major from version ${package_version}`);
  }

  if (minor === undefined) {
    throw new Error(`Unable to parse semver minor from version ${package_version}`);
  }

  switch (channel) {
    case 'canary':
      return 'main';
    case 'beta':
    case 'release':
      return channel;
    case 'lts':
    case 'lts-prev':
      return `lts-${major}-${minor}`;
    case 'release-prev':
      return `release-${major}-${minor}`;
    default:
      throw new Error(`Unable to determine expected branch name for channel ${channel} and version ${package_version}`);
  }
}
