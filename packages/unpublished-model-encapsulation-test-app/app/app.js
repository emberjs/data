import Application from '@ember/application';

import config from './config/environment';
import Resolver from './resolver';

window.EmberDataENV = {
  ENABLE_OPTIONAL_FEATURES: true,
};

const App = Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver,
});

export default App;
