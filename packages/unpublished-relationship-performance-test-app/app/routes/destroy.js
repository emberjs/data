import Route from '@ember/routing/route';
import { schedule } from '@ember/runloop';

import { all, Promise } from 'rsvp';

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

    performance.mark('start-destroyRecord');
    const parent = result[0];
    const childrenPromise = all(
      parent
        .get('children')
        .toArray()
        .map((child) => child.destroyRecord().then(() => child.unloadRecord()))
    );
    const parentPromise = parent.destroyRecord().then(() => parent.unloadRecord());

    return all([childrenPromise, parentPromise]).then(
      () =>
        new Promise((resolve, reject) => {
          schedule('destroy', this, () => {
            performance.mark('end-destroyRecord');
            performance.measure('destroyRecord', 'start-destroyRecord', 'end-destroyRecord');
            resolve();
          });
        })
    );
  },

  afterModel() {
    endTrace();
  },
});
