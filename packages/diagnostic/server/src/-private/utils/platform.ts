import os from 'node:os';

export type OSPlatform = 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win';
export type SupportedPlatform = 'win' | 'darwin';

function test(platform: string): platform is 'win' {
  return /^win/.test(platform);
}

const currentPlatform = test(os.platform());

export function isWin(platform?: string): platform is 'win' {
  if (platform) {
    return test(platform);
  }

  return currentPlatform;
}

export function isMac(platform?: string) {
  if (platform) {
    return /^darwin/.test(platform);
  }

  return /^darwin/.test(os.platform());
}

export function isLinux(platform?: string) {
  if (platform) {
    return /^linux/.test(platform);
  }

  return /^linux/.test(os.platform());
}

export function platformName(): OSPlatform {
  const platform = os.platform() as OSPlatform;
  return isWin(platform) ? 'win' : platform;
}

export function isSupportedPlatform(platform: OSPlatform): platform is 'win' | 'darwin' {
  return isWin(platform) || isMac(platform);
}
