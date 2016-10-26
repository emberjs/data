/* global window, heimdall, console */
import Ember from 'ember';

const {
  Route
} = Ember;

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
