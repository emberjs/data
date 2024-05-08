import { findAll } from '@ember-data/legacy-compat/builders';
// 1
const {
  content: {
    // 2
    // 3
    // 4
    id,
  },
} = await store.request(findAll<Post>('post'));
