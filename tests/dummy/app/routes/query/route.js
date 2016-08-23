/* global window, heimdall, console */
import Ember from 'ember';
import instrumentBaseObjects from '../../helpers/reopen-instrumentation';
import config from 'dummy/config/environment';

const {
  getOwner,
  Route
} = Ember;

let HAS_INSTRUMENTED = false;

export default Route.extend({

  queryParams: {
    limit: {
      refreshModel: true
    },
    modelName: {
      refreshModel: true
    }
  },

  model(params) {
    // switch this to 'production' when generating production build baselines
    if (config.environment === 'development' && !HAS_INSTRUMENTED) {
      instrumentBaseObjects(getOwner(this));
      HAS_INSTRUMENTED = true;
    }

    let modelName = params.modelName;
    delete params.modelName;

    let token = heimdall.start('ember-data');
    return this.get('store').query(modelName, params)
      .then((records) => {
        heimdall.stop(token);
        window.result = heimdall.toString();

        return records;
      });
  }
});
