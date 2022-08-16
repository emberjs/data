import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  store: service(),

  model() {
    performance.mark('start-find-all');
    return this.store.findAll('car', { reload: true }).then((cars) => {
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
    });
  },
});
