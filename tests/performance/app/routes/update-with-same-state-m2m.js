/* eslint-disable no-console */
/* eslint-disable no-undef */
import Route from '@ember/routing/route';
import { service } from '@ember/service';

const DEBUG = false;

export default Route.extend({
  store: service(),

  async model() {
    DEBUG && console.groupCollapsed('test-setup');
    performance.mark('start-data-generation');

    const initialPayload = await fetch('./fixtures/big-many-to-many.json').then((r) => r.json());
    const initialPayload2 = structuredClone(initialPayload);
    const payloadWithRemoval = await fetch('./fixtures/big-many-to-many-with-removal.json').then((r) => r.json());
    // our relationship has 10 * number of colors generated members,
    // so this keeps us in-sync with the fixture generation
    const REMOVAL_COUNT =
      initialPayload.data[0].relationships.colors.data.length -
      payloadWithRemoval.data[0].relationships.colors.data.length;

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
    seen.clear();
    const removedColors = [];

    DEBUG && console.groupEnd();
    DEBUG && console.log(structuredClone(getWarpDriveMetricCounts()));

    performance.mark('start-local-removal');
    console.groupCollapsed('start-local-removal');
    for (const car of peekedCars) {
      const colors = car.colors;
      removedColors.push(colors.splice(0, REMOVAL_COUNT));
    }
    peekedCars.forEach((car) => iterateCar(car, seen));
    seen.clear();

    DEBUG && console.groupEnd();
    DEBUG && console.log(structuredClone(getWarpDriveMetricCounts()));

    performance.mark('start-push-minus-one-payload');
    DEBUG && console.groupCollapsed('start-push-minus-one-payload');

    this.store.push(payloadWithRemoval);
    DEBUG && console.groupEnd();
    DEBUG && console.log(structuredClone(getWarpDriveMetricCounts()));

    performance.mark('start-local-addition');
    DEBUG && console.groupCollapsed('start-local-addition');
    // note, due to their position, the cars relationship on 50% of
    // colors will end up reversed, causing us to generate a notification.
    // this is because when we initially remove the colors from cars,
    // we remove the car from wherever it occurs. When we re-add, that
    // counts as re-adding "to the end" of the relationship since the
    // removal was previously committed.
    // To not generate a notification in this benchmark, the API response
    // would need to account for the natural re-ordering of cars in the colors
    // relationship.
    //
    // colors.cars = [1, 2, 3]
    // cars.colors = [1, 2, 3]
    // remove color 1 from cars.colors
    // colors.cars = [2, 3]
    // cars.colors = [2, 3]
    // now add color-1 back to cars.colors at the front
    // cars.colors = [1, 2, 3]
    // colors.cars = [2, 3, 1] // notice order change
    // but our payload will be [1, 2, 3] so we will generate a notification
    // for colors.cars (we should not generate one for cars.colors)
    for (let i = 0; i < peekedCars.length; i++) {
      const car = peekedCars[i];
      car.colors = removedColors[i].concat(car.colors);
    }
    peekedCars.forEach((car) => iterateCar(car, seen));
    seen.clear();

    DEBUG && console.groupEnd();
    DEBUG && console.log(structuredClone(getWarpDriveMetricCounts()));

    performance.mark('start-push-plus-one-payload');
    DEBUG && console.groupCollapsed('start-push-plus-one-payload');
    this.store.push(initialPayload2);
    DEBUG && console.groupEnd();
    DEBUG && console.log(structuredClone(getWarpDriveMetricCounts()));

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
