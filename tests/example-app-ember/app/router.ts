import EmberRouter from '@ember/routing/router';

import config from './config/environment';

export default class Router extends EmberRouter {
  location: string = config.locationType;
  rootURL: string = config.rootURL;
}

Router.map(function () {
  // Add route declarations here
});
