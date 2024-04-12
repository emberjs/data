const validPost = store.findRecord('post', '1');
const invalidPost = store.findRecord('post', '1', {
  preload: {},
});
