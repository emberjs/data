const post = store.findRecord('post', '1', {
  reload: true,
  backgroundReload: false,
  include: 'author,comments',
  adapterOptions: {},
});
