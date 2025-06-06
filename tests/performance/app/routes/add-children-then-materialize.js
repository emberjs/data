import Route from '@ember/routing/route';
import { service } from '@ember/service';

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

    performance.mark('start-materialize-records');
    const peekedParents = this.store.peekAll('parent').slice();
    this.store.peekAll('child').slice();

    performance.mark('start-materialize-relationships');
    const seen = new Set();
    peekedParents.forEach((parent) => iterateParent(parent, seen));

    performance.mark('end-materialize-relationships');
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
