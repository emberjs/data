import Route from '@ember/routing/route';

import { createParentPayload } from '../utils/create-parent-payload';

export default Route.extend({
  model() {
    performance.mark('start-data-generation');

    const initialPayload = createParentPayload(19600);
    const updatePayload = createParentPayload(20000);

    performance.mark('start-push-initial-payload');
    this.store.push(initialPayload);

    performance.mark('start-push-update-payload');
    this.store.push(updatePayload);
    performance.mark('end-push-update-payload');
  },
});
