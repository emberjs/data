const post = store.findRecord<Post>(
  { type: 'post', id: '1' },
  {
    reload: true,
    backgroundReload: false,
    include: 'author,comments',
    adapterOptions: {},
  }
);
