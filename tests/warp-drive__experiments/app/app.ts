import '@warp-drive/ember/install';

import Application from '@ember/application';

import loadInitializers from 'ember-load-initializers';

import config from './config/environment';
import Resolver from './resolver';

class App extends Application {
  modulePrefix: string = config.modulePrefix;
  podModulePrefix: string = config.podModulePrefix;
  Resolver: typeof Resolver = Resolver;
}

loadInitializers(App, config.modulePrefix);

export default App;
