const validPost = await store.findRecord('post', '1');
const invalidPost = await store.findRecord('post', '1', {
  preload: {},
});
