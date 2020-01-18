import Route from '@ember/routing/route';

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
      performance.mark('end-find-all');
      return flattened;
    });
  },
  afterModel() {
    if (document.location.href.indexOf('?tracing') !== -1 || document.location.href.indexOf('?tracerbench=true') !== -1) {
      endTrace();
    }
  },
});

function endTrace() {
  // just before paint
  requestAnimationFrame(() => {
    // after paint
    requestAnimationFrame(() => {
      document.location.href = 'about:blank';
    });
  });
}
