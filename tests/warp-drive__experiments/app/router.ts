import EmberRouter from '@ember/routing/router';

import config from './config/environment';

class Router extends EmberRouter {
  location: string = config.locationType;
  rootURL: string = config.rootURL;
}

Router.map(function () {});

export default Router;
