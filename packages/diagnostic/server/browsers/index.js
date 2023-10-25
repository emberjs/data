import os from 'os';
import path from 'path';
import tmp from 'tmp';

import { debug } from '../utils/debug.js';
import { isWin, platformName } from '../utils/platform.js';

export function getHomeDir() {
  return process.env.HOME || process.env.USERPROFILE;
}

function chromeWinPaths(name) {
  const homeDir = getHomeDir();
  return [
    homeDir + '\\Local Settings\\Application Data\\Google\\' + name + '\\Application\\chrome.exe',
    homeDir + '\\AppData\\Local\\Google\\' + name + '\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\' + name + '\\Application\\Chrome.exe',
    'C:\\Program Files (x86)\\Google\\' + name + '\\Application\\Chrome.exe',
  ];
}

function chromeDarwinPaths(name) {
  const homeDir = getHomeDir();
  return [
    homeDir + '/Applications/' + name + '.app/Contents/MacOS/' + name,
    '/Applications/' + name + '.app/Contents/MacOS/' + name,
  ];
}

const ChromePaths = {
  win: chromeWinPaths,
  darwin: chromeDarwinPaths,
};

const ChromeTags = {
  win: {
    stable: 'Chrome',
    beta: 'Chrome Beta',
    canary: 'Chrome SxS',
  },
  darwin: {
    stable: 'Google Chrome',
    beta: 'Google Chrome Beta',
    canary: 'Google Chrome Canary',
  },
};

const ChromeExeNames = {
  stable: ['google-chrome-stable', 'google-chrome', 'chrome'],
  beta: ['google-chrome-beta'],
  canary: ['google-chrome-unstable'],
};

async function executableExists(exe) {
  const cmd = isWin() ? 'where' : 'which';
  const result = Bun.spawnSync([cmd, exe], {
    stdout: 'inherit',
  });

  return result.success;
}

async function isInstalled(browser) {
  const result = await checkBrowser(browser.possiblePath, fileExists);
  if (result) {
    return result;
  }

  return checkBrowser(browser.possibleExe, function (exe) {
    return executableExists(exe);
  });
}

async function fileExists(file) {
  const pointer = Bun.file(file);
  return pointer.exists();
}

async function checkBrowser(lookups, method) {
  if (!lookups) {
    return false;
  }

  if (Array.isArray(lookups)) {
    for (const option of lookups) {
      const result = await method(option);
      if (result) {
        return option;
      }
    }
    return false;
  }

  if (await method(lookups)) {
    return lookups;
  }
}

async function getChrome(browser, tag) {
  const platform = platformName();
  const pathName = ChromeTags[platform]?.[tag];
  const paths = ChromePaths[platform]?.(pathName) ?? [];

  const lookupInfo = {
    name: browser.toLowerCase(),
    possiblePath: paths,
    possibleExe: ChromeExeNames[tag],
  };

  const result = await isInstalled(lookupInfo);
  if (!result) {
    throw new Error(
      `Could not find ${
        lookupInfo.name
      } on your system (${platform}).\n\n\tChecked Paths:\n\t\t${lookupInfo.possiblePath.join(
        '\n\t\t'
      )}\n\tChecked Executable Names:\n\t\t${lookupInfo.possibleExe.join('\n\t\t')}`
    );
  }

  debug(`Found ${lookupInfo.name} executable ${result}`);

  return result;
}

export async function getBrowser(browser) {
  const name = browser.toLowerCase();
  if (name === 'chrome') {
    return getChrome(name, 'stable');
  }
  if (name === 'chrome-beta') {
    return getChrome(name, 'beta');
  }
  if (name === 'chrome-canary') {
    return getChrome(name, 'canary');
  }

  throw new Error(`@warp-drive/diagnostic has no launch information for ${browser}`);
}

const TMP_DIRS = new Map();

export function getTmpDir(browser) {
  if (TMP_DIRS.has(browser)) {
    return TMP_DIRS.get(browser).name;
  }

  const userDataDir = os.tmpdir();
  const tmpPath = path.join(userDataDir, 'testem-' + browser.replace(' ', '_'));

  const tmpDir = tmp.dirSync({
    template: `${tmpPath}-XXXXXX`,
    unsafeCleanup: true,
  });

  TMP_DIRS.set(browser, tmpDir);
  return tmpDir.name;
}

export function recommendedArgs(browser, options = {}) {
  if (!browser || browser.toLowerCase() !== 'chrome') {
    return [];
  }
  const DEBUG = options.debug || debug.enabled;
  const DEBUG_MEMORY = options.memory || process.env.DEBUG_MEMORY;
  const SERVE = 'serve' in options ? options.serve : false;
  const HEADLESS = 'headless' in options ? options.headless : !SERVE;
  const useExisting = 'useExisting' in options ? options.useExisting : false;
  const noLaunch = 'noLaunch' in options ? options.noLaunch : false;

  if (noLaunch) {
    return [];
  }

  if (useExisting) {
    return ['--incognito'];
  }

  // See https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md
  // For more details on these flags
  return [
    '--user-data-dir=' + getTmpDir(browser),
    HEADLESS ? '--headless=new' : false,
    '--no-sandbox',
    // these prevent user account
    // and extensions from mucking with things
    '--incognito',
    '--bwsi',
    '--enable-automation',

    // potentially needed to enable multi-tab
    '--allow-http-background-page',
    // '--silent-debugger-extension-api',
    '--disable-throttle-non-visible-cross-origin-iframes',
    // '--memory-saver-multi-state-mode=discarded',
    // '--disable-battery-saver-mode',
    // '--disable-memory-saver-mode',
    // '--enable-background-thread-pool',
    // '--disable-background-media-suspend',
    // '--disable-tab-discarding',
    // '--disable-aggressive-tab-discard',
    // disabled because already enabled elsewhere
    // '--disable-backgrounding-occluded-windows',

    // Enable Debugging Output
    DEBUG ? '--enable-logging=stderr' : '--disable-logging',
    DEBUG ? '--v=2' : false,

    // when debugging memory usage this gives us better data
    DEBUG_MEMORY ? '--enable-precise-memory-info' : false,
    DEBUG_MEMORY ? '--js-flags="--allow-natives-syntax --expose-gc"' : false,

    // Disable Browser Features we don't want
    // =====================================
    '--ash-no-nudges',
    '--autoplay-policy=user-gesture-required',
    '--disable-add-to-shelf',
    '--disable-client-side-phishing-detection',
    '--disable-component-extensions-with-background-pages',
    '--disable-default-apps',
    '--disable-desktop-notifications',
    '--disable-popup-blocking',
    '--disable-domain-reliability',
    '--disable-extensions',
    '--disable-infobars',
    '--disable-notifications',
    '--disable-search-engine-choice-screen',
    '--disable-setuid-sandbox',
    '--disable-site-isolation-trials',
    '--disable-sync',
    '--force-color-profile=srgb',
    '--force-device-scale-factor=1',
    // This can cause a test to flake
    // '--hide-scrollbars',
    '--ignore-certificate-errors',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-first-run',
    '--test-type',

    // disable specific features
    // =====================================
    `--disable-features=${[
      'ChromeEOLPowerSaveMode',
      'AutofillServerCommunication',
      'AvoidUnnecessaryBeforeUnloadCheckSync',
      'BackForwardCache',
      'BlinkGenPropertyTrees',
      'CalculateNativeWinOcclusion',
      'CertificateTransparencyComponentUpdater',
      'DialMediaRouteProvider',
      // 'HeavyAdPrivacyMitigation',
      'InterestFeedContentSuggestions',
      'IsolateOrigins',
      'LazyFrameLoading',
      'MediaRouter',
      'OptimizationHints',
      // 'ScriptStreaming',
      'Translate',
    ]
      .filter(Boolean)
      .join(',')}`,

    // Adjust Task Throttling
    // =====================================
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-renderer-backgrounding',

    // Disable Background Networking
    // =====================================
    '--disable-background-networking',
    DEBUG ? false : '--disable-breakpad',
    '--disable-component-update',
    '--disable-domain-reliability',
    '--no-pings',

    // On Ubuntu this dev-shm-usage speeds you up on bigger machines
    // and slows you down on smaller. If you are on a larger CI box
    // you should consider re-enabling this.
    // off because ubuntu vms currently seem to crash without this
    // due to missing drivers
    // '--disable-dev-shm-usage',

    // Potentially no longer needed settings
    // =====================================
    '--disable-gpu',
    '--disable-3d-apis',
    '--disable-software-rasterizer',
    '--disable-webgl',
    // disable-web-security seems to cause browser not able to connect issues
    // '--disable-web-security',
    '--disable-remote-fonts',
    '--blink-settings=imagesEnabled=false',

    // ubuntu-16-core seems to be unhappy with this being set to a non-zero port
    // throws: ERROR:socket_posix.cc(147)] bind() failed: Address already in use (98)
    options.useEventSimulation ? '--remote-debugging-port=0' : false,
    options.useEventSimulation ? '--remote-debugging-address=0.0.0.0' : false,
    '--window-size=1440,900',
    // no-proxy seems to cause browser not able to connect issues
    // '--no-proxy-server',
    // '--proxy-bypass-list=*',
    // "--proxy-server='direct://'",
  ].filter(Boolean);
}
