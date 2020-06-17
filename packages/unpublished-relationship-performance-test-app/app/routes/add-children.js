import Route from '@ember/routing/route';

import { createParentPayload } from '../utils/create-parent-payload';
import { endTrace } from '../utils/end-trace';

export default Route.extend({
  model() {
    performance.mark('start-data-generation');

    const initialPayload = createParentPayload(19600);
    const updatePayload = createParentPayload(20000);

    performance.mark('end-data-generation');
    performance.measure('data-generation', 'start-data-generation', 'end-data-generation');

    performance.mark('start-push-initial-payload');
    this.store.push(initialPayload);
    performance.mark('end-push-initial-payload');
    performance.measure('push-initial-payload', 'start-push-initial-payload', 'end-push-initial-payload');

    performance.mark('start-push-update-payload');
    this.store.push(updatePayload);
    performance.mark('end-push-update-payload');
    performance.measure('push-update-payload', 'start-push-update-payload', 'end-push-update-payload');
  },

  afterModel() {
    endTrace();
  },
});
