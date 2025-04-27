// uncomment this to install Map/Set instrumentation
// prior to app boot
// import './services/store';
import Application from '@ember/application';

import compatModules from '@embroider/virtual/compat-modules';

import loadInitializers from 'ember-load-initializers';
import Resolver from 'ember-resolver';

import { setupSignals } from '@ember-data/store/configure';
import { buildSignalConfig } from '@warp-drive/ember/install';

import config from './config/environment';

setupSignals(buildSignalConfig);
class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver.withModules(compatModules);
}

loadInitializers(App, config.modulePrefix, compatModules);

export default App;
