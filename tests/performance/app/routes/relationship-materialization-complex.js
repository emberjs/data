import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default Route.extend({
  store: service(),

  async model() {
    performance.mark('start-data-generation');
    const payload = await fetch('./fixtures/relationship-materialization-complex.json').then((r) => r.json());
    const payload2 = structuredClone(payload);
    performance.mark('start-push-payload');
    this.store._push(payload);
    performance.mark('start-peek-records');
    const peekedChildren = this.store.peekAll('child');
    const peekedParents = this.store.peekAll('parent');
    performance.mark('start-record-materialization');
    peekedChildren.slice();
    peekedParents.slice();
    performance.mark('start-relationship-materialization');
    const seen = new Set();
    peekedParents.forEach((parent) => iterateParent(parent, seen));
    performance.mark('start-push-payload2');
    this.store._push(payload2);
    performance.mark('start-relationship-materialization2');
    const seen2 = new Set();
    peekedParents.forEach((parent) => iterateParent(parent, seen2));
    performance.mark('end-relationship-materialization2');
    // performance.measure('full-test', 'start-push-payload', 'end-relationship-materialization');
    // performance.measure('materialization', 'start-relationship-materialization', 'end-relationship-materialization');
  },
});

function iterateChild(record, seen) {
  if (seen.has(record)) {
    return;
  }
  seen.add(record);
  // record.parent.get('name');
  record.bestFriend.get('name');
  record.secondBestFriend.get('name');
  record.friends.forEach((child) => iterateChild(child, seen));
}
function iterateParent(record, seen) {
  seen.add(record);
  record.children.forEach((child) => iterateChild(child, seen));
}
