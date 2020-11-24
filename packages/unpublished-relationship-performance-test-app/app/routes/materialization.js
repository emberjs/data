import Route from '@ember/routing/route';

import { endTrace } from '../utils/end-trace';

export default Route.extend({
  model() {
    performance.mark('start-find-all');
    return this.store.findAll('car', { reload: true }).then(cars => {
      performance.mark('start-outer-materialization');
      const flattened = cars.map(car => {
        // enforce materialization of our relationships
        return {
          name: car.id,
          size: car.size.name,
          type: car.type.name,
          colors: car.colors.map(color => color.name),
        };
      });
      performance.mark('stop-outer-materialization');
      performance.measure('outer-materialization', 'start-outer-materialization', 'stop-outer-materialization');

      performance.mark('end-find-all');
      performance.measure('find-all', 'start-find-all', 'end-find-all');

      return flattened;
    });
  },

  afterModel() {
    endTrace();
  },
});
