const validPost = store.findRecord<Post>('post', '1');
const invalidPost = store.findRecord<Post>('post', '1', {
  preload: {},
});
