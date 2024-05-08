const post = await store.findAll('post', {
  reload: true,
  backgroundReload: false,
  include: 'author,comments',
  adapterOptions: {},
});
