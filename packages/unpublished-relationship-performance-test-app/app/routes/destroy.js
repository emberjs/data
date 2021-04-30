import Route from '@ember/routing/route';
import { run } from '@ember/runloop';

import { all } from 'rsvp';

export default Route.extend({
  async model() {
    performance.mark('start-data-generation');
    const payload = await fetch('./fixtures/destroy.json').then((r) => r.json());

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
