const semver = require('semver');

function removePrerelease(version) {
  return `${semver.major(version)}.${semver.minor(version)}.${semver.patch(version)}`;
}

/**
 * Determine the next alpha version depending on thee state of the latest entries of versions.
 *
 * Versions are expected to be in the following format:
 * [
 *    "3.25.0"
 *    "3.26.0-alpha.0",
 *    "3.26.0-beta.0"
 *  ]
 * @param {array<string>} versions - Array of strings in expected to be in th form described above
 * @returns {string}
 */
function determineNextAlpha(versions) {
  let idx = versions.length - 1;
  let lastAlpha;
  let lastBeta;
  let lastRelease;

  // Iterate until we find a release or exhausted array
  while (idx > -1) {
    const version = versions[idx];
    if (version.indexOf('-alpha.') > -1 && !lastAlpha) {
      lastAlpha = version;
    } else if (version.indexOf('-beta.') > -1 && !lastBeta) {
      lastBeta = version;
    } else if (version.split('.').length === 3) {
      lastRelease = version;
      break;
    }
    idx--;
  }

  if (lastBeta) {
    // This would mean there was a beta version with a release version higher than alpha
    if (lastAlpha && semver.lt(removePrerelease(lastAlpha), removePrerelease(lastBeta))) {
      return `${removePrerelease(lastBeta)}-alpha.0`;
    }
  }

  if (lastAlpha) {
    return semver.inc(lastAlpha, 'prerelease', 'alpha');
  }

  if (lastRelease && !lastAlpha) {
    const nextReleaseMinor = semver.inc(lastRelease, 'minor');
    return `${nextReleaseMinor}-alpha.0`;
  }

  throw Error('Could not determine next version because no recent release or alpha version');
}

module.exports = determineNextAlpha;
