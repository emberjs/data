import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  store: service(),

  async model() {
    console.group('test-setup');
    performance.mark('start-data-generation');

    const initialPayload = await fetch('./fixtures/add-children-initial.json').then((r) => r.json());
    const initialPayload2 = structuredClone(initialPayload);

    const payloadWithRemoval = structuredClone(initialPayload);
    payloadWithRemoval.data.relationships.children.data.splice(0, 19000);
    payloadWithRemoval.included.splice(0, 19000);

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

    await logChildren(parent);
    console.groupEnd();

    performance.mark('start-local-removal');
    console.group('start-local-removal');
    const removedChildren = children.splice(0, 19000);
    await logChildren(parent);
    console.groupEnd();

    performance.mark('start-push-minus-one-payload');
    console.group('start-push-minus-one-payload');
    this.store.push(payloadWithRemoval);
    await logChildren(parent);
    console.groupEnd();

    performance.mark('start-local-addition');
    console.group('start-local-addition');
    parent.children = children.concat(removedChildren);
    await logChildren(parent);
    console.groupEnd();

    performance.mark('start-push-plus-one-payload');
    console.group('start-push-plus-one-payload');
    this.store.push(initialPayload2);
    await logChildren(parent);
    console.groupEnd();

    performance.mark('end-push-plus-one-payload');
  },
});

async function logChildren(parent) {
  const children = await parent.children;
  console.log(
    `children is an array of length ${children.length} of ids ${children.at(0).id}..${children.at(children.length - 1).id}`
  );
}

function iterateChild(record, seen) {
  if (seen.has(record)) {
    return;
  }
  seen.add(record);

  record.parent.get('name');
}

function iterateParent(record, seen) {
  seen.add(record);
  record.children.forEach((child) => iterateChild(child, seen));
}
