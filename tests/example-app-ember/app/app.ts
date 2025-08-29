import '@warp-drive/ember/install';

import Application from '@ember/application';

import loadInitializers from 'ember-load-initializers';

import { setBuildURLConfig } from '@ember-data/request-utils';

import config from './config/environment';
import Resolver from './resolver';

setBuildURLConfig({
  host: '/',
  namespace: 'api',
});

class App extends Application {
  modulePrefix: string = config.modulePrefix;
  podModulePrefix: string = config.podModulePrefix;
  Resolver: typeof Resolver = Resolver;
}

loadInitializers(App, config.modulePrefix);

export default App;
