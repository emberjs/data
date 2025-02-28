import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  store: service(),

  async model() {
    performance.mark('start-data-generation');

    const initialPayload = await fetch('./fixtures/add-children-initial.json').then((r) => r.json());
    const initialPayload2 = structuredClone(initialPayload);

    const minusOnePayload = structuredClone(initialPayload);
    minusOnePayload.data.relationships.children.data.pop();
    minusOnePayload.included.pop();

    performance.mark('start-push-initial-payload');
    this.store.push(initialPayload);

    performance.mark('start-peek-records');
    const peekedChildren = this.store.peekAll('child');
    const peekedParents = this.store.peekAll('parent');

    performance.mark('start-record-materialization');
    peekedChildren.slice();
    peekedParents.slice();

    performance.mark('start-relationship-materialization');
    const seen = new Set();
    peekedParents.forEach((parent) => iterateParent(parent, seen));
    const parent = peekedParents[0];
    const children = await parent.children;

    performance.mark('start-local-removal');
    const removedChild = children.pop();

    performance.mark('start-push-minus-one-payload');
    this.store.push(minusOnePayload);

    performance.mark('start-local-addition');
    children.push(removedChild);

    performance.mark('start-push-plus-one-payload');
    this.store.push(initialPayload2);

    performance.mark('start-local-replacement');
    parent.children = children.slice();

    performance.mark('start-push-replacement-payload');
    this.store.push(initialPayload2);

    performance.mark('end-push-replacement-payload');
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
