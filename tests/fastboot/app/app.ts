import Application from '@ember/application';

import loadInitializers from 'ember-load-initializers';

import config from './config/environment';
import Resolver from './resolver';

const App = Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver,
});

if (typeof FastBoot !== 'undefined') {
  globalThis.AbortController = FastBoot.require('fastboot-abort-controller') as { new (): AbortController };
}

loadInitializers(App, config.modulePrefix);

export default App;
