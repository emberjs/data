import os from 'os';

function test(platform) {
  return /^win/.test(platform);
}

const currentPlatform = test(os.platform());

export function isWin(platform) {
  if (platform) {
    return test(platform);
  }

  return currentPlatform;
}

export function isMac(platform) {
  if (platform) {
    return /^darwin/.test(platform);
  }

  return /^darwin/.test(os.platform());
}

export function isLinux(platform) {
  if (platform) {
    return /^linux/.test(platform);
  }

  return /^linux/.test(os.platform());
}

export function platformName() {
  return isWin() ? 'win' : os.platform();
}
