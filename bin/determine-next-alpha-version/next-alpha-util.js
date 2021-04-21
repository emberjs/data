const semver = require('semver');

function removePrerelease(version) {
  return `${semver.major(version)}.${semver.minor(version)}.${semver.patch(version)}`;
}

/**
 * Determine the next alpha version depending on thee state of the latest entries of versions. Always maintain that
 * alpha is 2 minor versions away from a release and 1 minor version away from beta.
 *
 * Versions are expected to be in the following format:
 * [
 *    "3.25.0"
 *    "3.27.0-alpha.0",
 *    "3.26.0-beta.0"
 *  ]
 *
 * @param {array<string>} versions - Array of strings in expected to be in th form described above
 * @returns {string}
 */
function determineNextAlpha(versions) {
  let idx = versions.length - 1;
  let lastAlpha;
  let lastBeta;
  let lastRelease;

  // Iterate until we find a release version or exhausted array
  while (idx > -1) {
    const version = versions[idx];
    if (version.indexOf('-alpha.') > -1 && !lastAlpha) {
      lastAlpha = version;
    } else if (version.indexOf('-beta.') > -1 && !lastBeta) {
      lastBeta = version;
    } else if (version.split('.').length === 3 && semver.patch(version) === 0 && !lastRelease) {
      lastRelease = version;
    }

    if (lastAlpha && lastBeta && lastRelease) {
      break;
    }

    idx--;
  }

  if (lastRelease) {
    if (lastAlpha && semver.lte(removePrerelease(lastAlpha), lastRelease)) {
      const twoMinorVersionsHigher = semver.inc(semver.inc(lastRelease, 'minor'), 'minor');
      return `${twoMinorVersionsHigher}-alpha.0`;
    }
  }

  if (lastBeta) {
    // If beta major & minor higher or equal, make next alpha one minor above
    if (lastAlpha && semver.lte(removePrerelease(lastAlpha), removePrerelease(lastBeta))) {
      const oneMinorAboveBeta = semver.inc(removePrerelease(lastBeta), 'minor');
      return `${oneMinorAboveBeta}-alpha.0`;
    }
  }

  if (lastAlpha) {
    // Simply increase prerelease version for existing alpha
    return semver.inc(lastAlpha, 'prerelease', 'alpha');
  }

  throw Error('Could not determine next version because no recent alpha version was published');
}

module.exports = determineNextAlpha;
