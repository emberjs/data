import process from 'process';

const DEBUG = Boolean(process.env.DEBUG) || false;
const DEBUG_MEMORY = Boolean(process.env.DEBUG_MEMORY) || false;
const DISABLE_HEADLESS = Boolean(process.env.DISABLE_HEADLESS) || false;

const flags = [
  // '--user-data-dir=' + getTmpDir(browser),
  DISABLE_HEADLESS ? false : '--headless=new',
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
  '--disable-proxy-certificate-handler',
  // useful in some situations when you trust that
  // your tests won't call out to the internet
  // '--disable-content-security-policy',
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
  // options.useEventSimulation ? '--remote-debugging-port=0' : false,
  // options.useEventSimulation ? '--remote-debugging-address=0.0.0.0' : false,
  '--window-size=1440,900',
  // no-proxy seems to cause browser not able to connect issues
  // '--no-proxy-server',
  // '--proxy-bypass-list=*',
  // "--proxy-server='direct://'",
].filter(Boolean);

process.stdout.write(JSON.stringify(flags) + '\n');
process.exit(0);
