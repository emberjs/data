const validPost = await store.findRecord<Post>({ type: 'post', id: '1' });
const invalidPost = await store.findRecord<Post>(
  { type: 'post', id: '1' },
  {
    preload: {},
  }
);
