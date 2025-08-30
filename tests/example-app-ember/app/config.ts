// @ts-expect-error
import { getGlobalConfig } from '@embroider/macros/src/addon/runtime';

const ENV = {
  modulePrefix: 'docs-app',
  environment: import.meta.env.DEV ? 'development' : 'production',
  rootURL: '/',
  locationType: 'history',
  EmberENV: {
    EXTEND_PROTOTYPES: false,
    FEATURES: {
      // Here you can enable experimental features on an ember canary build
      // e.g. EMBER_NATIVE_DECORATOR_SUPPORT: true
    },
  },
  APP: {
    // Here you can pass flags/options to your application instance
    // when it is created
  } as { autoboot?: boolean; rootElement?: string },
};

export default ENV;

export function enterTestMode() {
  ENV.locationType = 'none';
  ENV.APP.rootElement = '#ember-testing';
  ENV.APP.autoboot = false;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const config = getGlobalConfig()['@embroider/macros'];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (config) config.isTesting = true;
}
