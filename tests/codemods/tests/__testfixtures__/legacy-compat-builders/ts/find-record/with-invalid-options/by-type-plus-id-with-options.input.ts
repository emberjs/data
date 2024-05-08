const validPost = await store.findRecord<Post>('post', '1');
const invalidPost = await store.findRecord<Post>('post', '1', {
  preload: {},
});
