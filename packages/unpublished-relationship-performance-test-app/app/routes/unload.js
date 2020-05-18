import Route from '@ember/routing/route';
import { schedule } from '@ember/runloop';

import { Promise } from 'rsvp';

import { createParentPayload } from '../utils/create-parent-payload';
import { endTrace } from '../utils/end-trace';

export default Route.extend({
  model() {
    performance.mark('start-data-generation');

    const payload = createParentPayload(2000, 500);

    performance.mark('end-data-generation');
    performance.measure('data-generation', 'start-data-generation', 'end-data-generation');

    performance.mark('start-push-payload');
    const result = this.store.push(payload);
    performance.mark('end-push-payload');
    performance.measure('push-payload', 'start-push-payload', 'end-push-payload');

    performance.mark('start-unloadRecord');
    const parent = result[0];
    parent
      .get('children')
      .toArray()
      .forEach(child => child.unloadRecord());
    parent.unloadRecord();

    return new Promise((resolve, reject) => {
      schedule('destroy', this, () => {
        performance.mark('end-unloadRecord');
        performance.measure('unloadRecord', 'start-unloadRecord', 'end-unloadRecord');
        resolve();
      });
    });
  },

  afterModel() {
    endTrace();
  },
});
