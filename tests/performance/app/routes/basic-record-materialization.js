import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  store: service(),

  async model() {
    performance.mark('start-data-generation');
    const payload = await fetch('./fixtures/basic-record-materialization.json').then((r) => r.json());
    performance.mark('start-push-payload');
    this.store._push(payload);
    performance.mark('start-peek-records');
    const peekedChildren = this.store.peekAll('child');
    const peekedParents = this.store.peekAll('parent');
    performance.mark('start-record-materialization');
    peekedChildren.slice();
    peekedParents.slice();
    performance.mark('end-record-materialization');
  },
});
