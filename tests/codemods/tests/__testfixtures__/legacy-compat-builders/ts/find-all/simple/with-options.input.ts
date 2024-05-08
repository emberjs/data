const post = await store.findAll<Post>('post', {
  reload: true,
  backgroundReload: false,
  include: 'author,comments',
  adapterOptions: {},
});
