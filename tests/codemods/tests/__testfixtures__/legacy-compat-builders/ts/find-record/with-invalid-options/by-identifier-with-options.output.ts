import { findRecord } from '@ember-data/legacy-compat/builders';
const { content: validPost } = await store.request(findRecord<Post>({ type: 'post', id: '1' }));
const invalidPost = await store.findRecord<Post>(
  { type: 'post', id: '1' },
  {
    preload: {},
  }
);
