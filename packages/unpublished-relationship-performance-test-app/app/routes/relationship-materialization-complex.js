import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  store: service(),

  async model() {
    performance.mark('start-data-generation');
    const payload = await fetch('./fixtures/relationship-materialization-complex.json').then((r) => r.json());
    performance.mark('start-push-payload');
    this.store._push(payload);
    performance.mark('start-peek-records');
    const peekedChildren = this.store.peekAll('child');
    const peekedParents = this.store.peekAll('parent');
    performance.mark('start-record-materialization');
    peekedChildren.slice();
    peekedParents.slice();
    performance.mark('start-relationship-materialization');
    let seen = new Set();
    peekedParents.forEach((parent) => iterateParent(parent, seen));
    performance.mark('end-relationship-materialization');
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
