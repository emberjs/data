import { debug } from "../utils/debug";
import os from 'os';
import path from 'path';
import tmp from 'tmp';

export function getHomeDir() {
  return process.env.HOME || process.env.USERPROFILE;
}

export function chromeWinPaths(name) {
  const homeDir = getHomeDir();
  return [
    homeDir + '\\Local Settings\\Application Data\\Google\\' + name + '\\Application\\chrome.exe',
    homeDir + '\\AppData\\Local\\Google\\' + name + '\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\' + name + '\\Application\\Chrome.exe',
    'C:\\Program Files (x86)\\Google\\' + name + '\\Application\\Chrome.exe'
  ];
}

export function chromeOSXPaths(name) {
  const homeDir = getHomeDir();
  return [
    homeDir + '/Applications/' + name + '.app/Contents/MacOS/' + name,
    '/Applications/' + name + '.app/Contents/MacOS/' + name
  ];
}

export const WinChromeStable = chromeWinPaths('Chrome');
export const WinChromeBeta = chromeWinPaths('Chrome Beta');
export const WinChromeCanary = chromeWinPaths('Chrome SxS');
export const OSXChromeStable = chromeOSXPaths('Google Chrome');
export const OSXChromeBeta = chromeOSXPaths('Google Chrome Beta');
export const OSXChromeCanary = chromeOSXPaths('Google Chrome Canary');

export const ChromeExeNames = [
  'google-chrome',
  'google-chrome-stable',
  'chrome'
];

export async function getBrowser(browser) {
  return '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome';
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
    unsafeCleanup: true
  });

  TMP_DIRS.set(browser, tmpDir);
  return tmpDir.name;
}

export function recommendedArgs(browser) {
  if (!browser || browser.toLowerCase() !== 'chrome') {
    return [];
  }
  const DEBUG = debug.enabled;
  const DEBUG_MEMORY = process.env.DEBUG_MEMORY;

  // See https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md
  // For more details on these flags
  return [
    '--user-data-dir=' + getTmpDir(browser),
    '--headless=new',
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
    // and slows you down on smaller. We are on a bigger CI box now.
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
    '--remote-debugging-port=0',
    '--remote-debugging-address=0.0.0.0',
    '--window-size=1440,900',
    // no-proxy seems to cause browser not able to connect issues
    // '--no-proxy-server',
    // '--proxy-bypass-list=*',
    // "--proxy-server='direct://'",
  ].filter(Boolean);
}
