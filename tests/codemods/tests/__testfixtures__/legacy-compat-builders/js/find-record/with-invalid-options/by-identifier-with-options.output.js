const validPost = store.findRecord({ type: 'post', id: '1' });
const invalidPost = store.findRecord(
  { type: 'post', id: '1' },
  {
    preload: {},
  }
);
