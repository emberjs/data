import Route from '@ember/routing/route';

export default Route.extend({
  model() {
    // adding a model to the store to enable manually testing the debug-adapter
    return this.store.push({
      data: {
        id: 1,
        type: 'foo',
        attributes: {
          name: 'taco',
        },
      },
    });
  },
});
