const validPost = await store.findRecord({ type: 'post', id: '1' });
const invalidPost = await store.findRecord(
  { type: 'post', id: '1' },
  {
    preload: {},
  }
);
