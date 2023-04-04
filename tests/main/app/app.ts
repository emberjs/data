// disable the normalization cache as we no longer normalize, the cache has become a bottle neck.
// import { Registry } from '@ember/-internals/container';
import Application from '@ember/application';

import loadInitializers from 'ember-load-initializers';

import config from './config/environment';
import Resolver from './resolver';

// (Registry as { prototype: { normalize(v: string): string } }).prototype.normalize = function (i) {
//   return i;
// };

const EventConfig = {
  touchstart: null,
  touchmove: null,
  touchend: null,
  touchcancel: null,
  keydown: null,
  keyup: null,
  keypress: null,
  mousedown: null,
  mouseup: null,
  contextmenu: null,
  click: null,
  dblclick: null,
  focusin: null,
  focusout: null,
  submit: null,
  input: null,
  change: null,
  dragstart: null,
  drag: null,
  dragenter: null,
  dragleave: null,
  dragover: null,
  drop: null,
  dragend: null,
};

class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
  customEvents = EventConfig;
}

loadInitializers(App, config.modulePrefix);

export default App;
