// FIXME: Don't merge disables
/* eslint-disable no-console */
/* eslint-disable no-undef */
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

const REMOVAL_COUNT = 10;

export default Route.extend({
  store: service(),

  async model() {
    console.groupCollapsed('test-setup');
    performance.mark('start-data-generation');

    const initialPayload = await fetch('./fixtures/big-many-to-many.json').then((r) => r.json());
    const initialPayload2 = structuredClone(initialPayload);
    const payloadWithRemoval = await fetch('./fixtures/big-many-to-many-with-removal.json').then((r) => r.json());

    performance.mark('start-push-initial-payload');
    this.store.push(initialPayload);

    performance.mark('start-peek-records');
    const peekedCars = this.store.peekAll('car');
    const peekedColors = this.store.peekAll('color');

    performance.mark('start-record-materialization');
    peekedColors.slice();
    peekedCars.slice();

    performance.mark('start-relationship-materialization');
    const seen = new Set();
    peekedCars.forEach((car) => iterateCar(car, seen));
    const removedColors = [];

    console.groupEnd();
    console.log(structuredClone(getWarpDriveMetricCounts()));

    performance.mark('start-local-removal');
    console.groupCollapsed('start-local-removal');
    for (const car of peekedCars) {
      const colors = car.colors;
      removedColors.push(colors.splice(0, REMOVAL_COUNT));
    }

    console.groupEnd();
    console.log(structuredClone(getWarpDriveMetricCounts()));

    performance.mark('start-push-minus-one-payload');
    console.groupCollapsed('start-push-minus-one-payload');
    this.store.push(payloadWithRemoval);
    console.groupEnd();
    console.log(structuredClone(getWarpDriveMetricCounts()));

    performance.mark('start-local-addition');
    console.groupCollapsed('start-local-addition');
    peekedCars.forEach((car, index) => {
      car.colors = removedColors[index].concat(car.colors);
    });

    console.groupEnd();
    console.log(structuredClone(getWarpDriveMetricCounts()));

    performance.mark('start-push-plus-one-payload');
    console.groupCollapsed('start-push-plus-one-payload');
    this.store.push(initialPayload2);
    console.groupEnd();
    console.log(structuredClone(getWarpDriveMetricCounts()));

    performance.mark('end-push-plus-one-payload');
  },
});

function iterateChild(record, seen) {
  if (seen.has(record)) {
    return;
  }
  seen.add(record);

  record.cars;
}

function iterateCar(record, seen) {
  seen.add(record);
  record.colors.forEach((color) => iterateChild(color, seen));
}
