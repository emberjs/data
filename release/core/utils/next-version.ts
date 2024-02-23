import { STRATEGY_TYPE, SEMVER_VERSION, CHANNEL } from '../../utils/channel';

import semver from 'semver';

/**
 * "Next Version" is a complicated subject.
 *
 * Disregarding "strategy" for the moment:
 *
 * If we are beta channel or canary channel
 * - then next patch means next prerelease e.g. from 1.0.0-beta.1 => 1.0.0-beta.2
 * - next minor means 1.0.0-beta.3 => 1.1.0-beta.1
 * - next major means 1.4.0-beta.3 => 2.0.0-beta.1
 *
 * If we are a release channel
 * - then next patch means next patch e.g. from 1.0.0 => 1.0.1
 * - next minor means 1.0.1 => 1.1.0 (valid only in a "re-release")
 * - next major means 1.1.0 => 2.0.0 (valid only in a "re-release")
 *
 * If we are any other channel, then only next patch is allowed.
 *
 * To promote an alpha to beta and a beta to release:
 *
 * 1.0.0-alpha.3 => 1.0.0-beta.1 is a "patch" performed via beta channel
 * 1.0.0-beta.3 => 1.0.0 is a "patch" performed via release channel
 *
 * However, "strategy" amends these rules. When considering strategy, the
 * above description applies to a "stable" package.
 *
 * ## Beta strategy adjustments
 *
 * If our strategy is "beta" then our "major" version should be "0".
 *
 * If we are a beta channel or canary channel
 * - then next patch means next prerelease e.g. from 0.1.0-beta.1 => 0.1.0-beta.2
 * - next minor increments the third number e.g. from 0.1.0-beta.2 => 0.1.1-beta.1
 * - next major means to bump the second number e.g. from 0.1.1-beta.3 => 0.2.0-beta.1
 *
 * If we are a release channel
 * - then next patch means next patch e.g. from 0.1.0 => 0.1.1
 * - next minor is equivalent to next patch e.g. 0.1.1 => 0.1.2 (valid only in a "re-release")
 * - next major increments the second number instead e.g. 0.1.1 => 0.2.0 (valid only in a "re-release")
 *
 * ## Alpha strategy adjustments
 *
 * If our strategy is "alpha" then our "major" version and our "minor" version should be "0".
 *
 * If we are a beta channel or canary channel
 * - then next patch means next prerelease e.g. from 0.0.0-beta.1 => 0.0.0-beta.2
 * - next minor increments the prerelease as well e.g. from 0.0.0-beta.1 => 0.0.0-beta.2
 * - next major means to bump the third number e.g. from 0.0.1-beta.3 => 0.0.2-beta.1
 *
 * If we are a release channel
 * - then next major, minor or patch all increment the third number e.g. from 0.0.0 => 0.0.1
 *
 *
 *
 * For re-release we will need to graph all versions associated with the prior release
 * and increment those somehow as fromVersion.
 */

export function getNextMajor(fromVersion: SEMVER_VERSION, channel: CHANNEL, strategy: STRATEGY_TYPE): SEMVER_VERSION {
  if (channel !== 'canary' && channel !== 'beta' && channel !== 'release') {
    throw new Error(`You cannot increment the major version directly within the '${channel}' channel.`);
  }

  switch (strategy) {
    case 'alpha':
      if (channel === 'canary') return semver.inc(fromVersion, 'prepatch', 'alpha') as SEMVER_VERSION;
      if (channel === 'beta') return semver.inc(fromVersion, 'prepatch', 'beta') as SEMVER_VERSION;
      return semver.inc(fromVersion, 'patch') as SEMVER_VERSION;

    case 'beta':
      if (channel === 'canary') return semver.inc(fromVersion, 'preminor', 'alpha') as SEMVER_VERSION;
      if (channel === 'beta') return semver.inc(fromVersion, 'preminor', 'beta') as SEMVER_VERSION;
      return semver.inc(fromVersion, 'minor') as SEMVER_VERSION;

    case 'stable':
      if (channel === 'canary') return semver.inc(fromVersion, 'premajor', 'alpha') as SEMVER_VERSION;
      if (channel === 'beta') return semver.inc(fromVersion, 'premajor', 'beta') as SEMVER_VERSION;
      return semver.inc(fromVersion, 'major') as SEMVER_VERSION;

    default:
      throw new Error(`Unexpected strategy '${strategy}'`);
  }
}

export function getNextMinor(fromVersion: SEMVER_VERSION, channel: CHANNEL, strategy: STRATEGY_TYPE): SEMVER_VERSION {
  if (channel !== 'canary' && channel !== 'beta' && channel !== 'release') {
    throw new Error(`You cannot increment the minor version directly within the '${channel}' channel.`);
  }

  switch (strategy) {
    case 'alpha':
      if (channel === 'canary') return semver.inc(fromVersion, 'prerelease', 'alpha') as SEMVER_VERSION;
      if (channel === 'beta') return semver.inc(fromVersion, 'prerelease', 'beta') as SEMVER_VERSION;
      return semver.inc(fromVersion, 'patch') as SEMVER_VERSION;

    case 'beta':
      if (channel === 'canary') return semver.inc(fromVersion, 'prepatch', 'alpha') as SEMVER_VERSION;
      if (channel === 'beta') return semver.inc(fromVersion, 'prepatch', 'beta') as SEMVER_VERSION;
      return semver.inc(fromVersion, 'minor') as SEMVER_VERSION;

    case 'stable':
      if (channel === 'canary') return semver.inc(fromVersion, 'preminor', 'alpha') as SEMVER_VERSION;
      if (channel === 'beta') return semver.inc(fromVersion, 'preminor', 'beta') as SEMVER_VERSION;
      return semver.inc(fromVersion, 'minor') as SEMVER_VERSION;

    default:
      throw new Error(`Unexpected strategy '${strategy}'`);
  }
}

export function getNextPatch(fromVersion: SEMVER_VERSION, channel: CHANNEL, strategy: STRATEGY_TYPE): SEMVER_VERSION {
  switch (strategy) {
    case 'alpha':
      if (channel === 'canary') return semver.inc(fromVersion, 'prerelease', 'alpha') as SEMVER_VERSION;
      if (channel === 'beta') return semver.inc(fromVersion, 'prerelease', 'beta') as SEMVER_VERSION;
      return semver.inc(fromVersion, 'patch') as SEMVER_VERSION;

    case 'beta':
      if (channel === 'canary') return semver.inc(fromVersion, 'prerelease', 'alpha') as SEMVER_VERSION;
      if (channel === 'beta') return semver.inc(fromVersion, 'prerelease', 'beta') as SEMVER_VERSION;
      return semver.inc(fromVersion, 'patch') as SEMVER_VERSION;

    case 'stable':
      if (channel === 'canary') return semver.inc(fromVersion, 'prerelease', 'alpha') as SEMVER_VERSION;
      if (channel === 'beta') return semver.inc(fromVersion, 'prerelease', 'beta') as SEMVER_VERSION;
      return semver.inc(fromVersion, 'patch') as SEMVER_VERSION;

    default:
      throw new Error(`Unexpected strategy '${strategy}'`);
  }
}

export function getNextVersion(
  fromVersion: SEMVER_VERSION,
  channel: CHANNEL,
  increment: 'major' | 'minor' | 'patch',
  strategy: STRATEGY_TYPE
): SEMVER_VERSION {
  switch (increment) {
    case 'major': {
      return getNextMajor(fromVersion, channel, strategy);
    }
    case 'minor': {
      return getNextMinor(fromVersion, channel, strategy);
    }
    case 'patch': {
      return getNextPatch(fromVersion, channel, strategy);
    }
    default:
      throw new Error(`Unexpected version increment method '${increment}'`);
  }
}
