import { findAll } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request(
  findAll<Post>('post', {
    reload: true,
    backgroundReload: false,
    include: 'author,comments',
    adapterOptions: {},
  })
);
