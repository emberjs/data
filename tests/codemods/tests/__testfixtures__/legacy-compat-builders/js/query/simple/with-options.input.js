const post = await store.query(
  'post',
  { id: '1' },
  {
    reload: true,
    backgroundReload: false,
    include: 'author,comments',
    adapterOptions: {},
  }
);
