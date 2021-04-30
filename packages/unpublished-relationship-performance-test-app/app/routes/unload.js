import Route from '@ember/routing/route';
import { run } from '@ember/runloop';

import { createParentPayload } from '../utils/create-parent-payload';

export default Route.extend({
  model() {
    performance.mark('start-data-generation');
    const payload = createParentPayload(2000, 500);
    performance.mark('start-push-payload');
    const result = this.store.push(payload);
    performance.mark('start-unload-records');
    const parent = result[0];
    run(() => {
      parent
        .get('children')
        .toArray()
        .forEach((child) => child.unloadRecord());
      parent.unloadRecord();
    });
    performance.mark('end-unload-records');
  },
});
