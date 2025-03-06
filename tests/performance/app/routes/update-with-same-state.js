import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  store: service(),

  async model() {
    performance.mark('start-data-generation');

    const initialPayload = await fetch('./fixtures/add-children-initial.json').then((r) => r.json());
    const initialPayload2 = structuredClone(initialPayload);
    const payloadWithRemoval = await fetch('./fixtures/add-children-with-removal.json').then((r) => r.json());

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
    const removedChildren = children.splice(0, 19000);

    performance.mark('start-push-minus-one-payload');
    this.store.push(payloadWithRemoval);

    performance.mark('start-local-addition');
    parent.children = removedChildren.concat(children);

    performance.mark('start-push-plus-one-payload');
    this.store.push(initialPayload2);

    performance.mark('end-push-plus-one-payload');
  },
});

function iterateChild(record, seen) {
  if (seen.has(record)) {
    return;
  }
  seen.add(record);

  record.parent;
}

function iterateParent(record, seen) {
  seen.add(record);
  record.children.forEach((child) => iterateChild(child, seen));
}
