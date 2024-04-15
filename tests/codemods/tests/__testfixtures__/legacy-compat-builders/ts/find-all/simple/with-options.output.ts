import { findAll } from '@ember-data/legacy-compat/builders';
const post = store.request<Post[]>(
  findAll<Post>('post', {
    reload: true,
    backgroundReload: false,
    include: 'author,comments',
    adapterOptions: {},
  })
).content;
