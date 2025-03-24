import Route from '@ember/routing/route';
import * as s from '@ember/service';

const service = s.service ?? s.inject;

export default Route.extend({
  store: service(),

  model() {
    return this.store.createRecord('person');
  },
});
