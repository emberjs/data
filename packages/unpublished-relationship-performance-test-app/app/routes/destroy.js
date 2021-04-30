import Route from '@ember/routing/route';
import { run } from '@ember/runloop';

import { all } from 'rsvp';

import { createParentPayload } from '../utils/create-parent-payload';

export default Route.extend({
  model() {
    performance.mark('start-data-generation');
    const payload = createParentPayload(2000, 500);
    performance.mark('start-push-payload');
    const result = this.store.push(payload);
    performance.mark('start-destroy-records');
    const parent = result[0];
    const childrenPromise = all(
      parent
        .get('children')
        .toArray()
        .map((child) => child.destroyRecord().then(() => run(() => child.unloadRecord())))
    );
    const parentPromise = parent.destroyRecord().then(() => run(() => parent.unloadRecord()));

    return all([childrenPromise, parentPromise]).then(() => {
      performance.mark('end-destroy-records');
    });
  },
});
