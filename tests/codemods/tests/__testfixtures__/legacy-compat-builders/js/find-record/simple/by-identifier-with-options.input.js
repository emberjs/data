const post = await store.findRecord(
  { type: 'post', id: '1' },
  {
    reload: true,
    backgroundReload: false,
    include: 'author,comments',
    adapterOptions: {},
  }
);
