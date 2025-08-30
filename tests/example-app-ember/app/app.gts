import '@warp-drive/ember/install';

import EmberRouter from '@ember/routing/router';

import Application from 'ember-strict-application-resolver';

import { setBuildURLConfig } from '@warp-drive/utilities';

class Router extends EmberRouter {
  location = 'history';
  rootURL = '/';
}

Router.map(function () {
  // Add route declarations here
});

setBuildURLConfig({
  host: '/',
  namespace: 'api',
});
import VerticalCollection from '@html-next/vertical-collection';
import { pageTitle } from 'ember-page-title';
import PageTitle from 'ember-page-title/services/page-title';

class App extends Application {
  modules = {
    './router': Router,
    './helpers/page-title': pageTitle,
    './services/page-title': PageTitle,
    './components/vertical-collection': VerticalCollection,
    ...import.meta.glob('./helpers/*', { eager: true }),
    ...import.meta.glob('./services/*', { eager: true }),
    ...import.meta.glob('./routes/*', { eager: true }),
    ...import.meta.glob('./components/*', { eager: true }),
    ...import.meta.glob('./templates/*', { eager: true }),
  };
}

export default App;
