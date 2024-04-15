const post = store.queryRecord<Post>(
  'post',
  { id: '1' },
  {
    reload: true,
    backgroundReload: false,
    include: 'author,comments',
    adapterOptions: {},
  }
);
