import EmberRouter from '@ember/routing/router';

import config from './config/environment';

const Router = EmberRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL,
});

Router.map(function () {
  this.route('basic-record-materialization');
  this.route('relationship-materialization-simple');
  this.route('relationship-materialization-complex');
  this.route('add-children');
  this.route('add-children-then-materialize');
  this.route('add-children-to-materialized');
  this.route('unload');
  this.route('unload-all');
  this.route('destroy');
  this.route('unused-relationships');
});

export default Router;
