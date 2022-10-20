import Application from '@ember/application';

import config from './config/environment';
import Resolver from './resolver';

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
}
