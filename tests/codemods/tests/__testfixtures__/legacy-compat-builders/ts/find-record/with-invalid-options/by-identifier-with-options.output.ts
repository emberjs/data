const validPost = store.findRecord<Post>({ type: 'post', id: '1' });
const invalidPost = store.findRecord<Post>(
  { type: 'post', id: '1' },
  {
    preload: {},
  }
);
