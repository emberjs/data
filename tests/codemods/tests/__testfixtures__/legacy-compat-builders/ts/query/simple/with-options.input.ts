const post = store.query<Post>(
  'post',
  { id: '1' },
  {
    reload: true,
    backgroundReload: false,
    include: 'author,comments',
    adapterOptions: {},
  }
);
