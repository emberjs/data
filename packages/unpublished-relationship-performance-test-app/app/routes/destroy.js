import Route from '@ember/routing/route';

import { all } from 'rsvp';

export default Route.extend({
  async model() {
    performance.mark('start-data-generation');
    const payload = await fetch('./fixtures/destroy.json').then((r) => r.json());

    performance.mark('start-push-payload');
    const parent = this.store.push(payload);
    performance.mark('start-destroy-records');
    const childrenPromise = all(
      parent
        .get('children')
        .toArray()
        .map((child) => child.destroyRecord())
    );
    const parentPromise = parent.destroyRecord();

    return all([childrenPromise, parentPromise]).then(() => {
      performance.mark('end-destroy-records');
    });
  },
});
