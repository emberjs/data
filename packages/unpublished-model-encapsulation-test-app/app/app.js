import Application from '@ember/application';
import Resolver from './resolver';
import loadInitializers from 'ember-load-initializers';
import config from './config/environment';

window.EmberDataENV = {
  ENABLE_OPTIONAL_FEATURES: true,
  FEATURES: {
    CUSTOM_MODEL_CLASS: true,
  },
};

const App = Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver,
});

loadInitializers(App, config.modulePrefix);

export default App;
