import { findRecord } from '@ember-data/legacy-compat/builders';
const post = store.request<Post>(
  findRecord<Post>('post', '1', {
    reload: true,
    backgroundReload: false,
    include: 'author,comments',
    adapterOptions: {},
  })
).content;
