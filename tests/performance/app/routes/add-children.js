import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  store: service(),

  async model() {
    performance.mark('start-data-generation');

    const initialPayload = await fetch('./fixtures/add-children-initial.json').then((r) => r.json());
    const updatePayload = await fetch('./fixtures/add-children-final.json').then((r) => r.json());

    performance.mark('start-push-initial-payload');
    this.store.push(initialPayload);

    performance.mark('start-push-update-payload');
    this.store.push(updatePayload);
    performance.mark('end-push-update-payload');
  },
});
