import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

import { query } from '@ember-data/json-api/request';

export default Route.extend({
  store: service(),

  async model() {
    performance.mark('start-find-all');
    await this.store.request(query('car', {}, { resourcePath: 'fixtures/relationship-materialization-simple.json' }));
    const cars = this.store.peekAll('car');

    performance.mark('start-materialization');
    const flattened = cars.map((car) => {
      // enforce materialization of our relationships
      return {
        name: car.id,
        size: car.size.name,
        make: car.make.name,
        colors: car.colors.map((color) => color.name),
      };
    });
    performance.mark('end-materialization');
    return flattened;
  },
});
