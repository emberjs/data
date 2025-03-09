import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

import { deleteRecord } from '@ember-data/json-api/request';

export default Route.extend({
  store: service(),

  async model() {
    performance.mark('start-data-generation');
    const payload = await fetch('./fixtures/destroy.json').then((r) => r.json());

    performance.mark('start-push-payload');
    const { store } = this;
    const parent = store.push(payload);
    performance.mark('start-destroy-records');
    const children = await parent.children;

    const childrenPromise = Promise.all(
      children.slice().map((child) => {
        child.deleteRecord();
        return store.request(deleteRecord(child)).then(() => child.unloadRecord());
      })
    );
    parent.deleteRecord();
    const parentPromise = store.request(deleteRecord(parent)).then(() => parent.unloadRecord());

    await Promise.all([childrenPromise, parentPromise]);

    performance.mark('end-destroy-records');
  },
});
