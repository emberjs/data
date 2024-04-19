import { findAll } from '@ember-data/legacy-compat/builders';
// 1
const {
  content: {
    // 2
    id, // 3
    // 4
  },
} = await store.request<Post[]>(findAll<Post>('post'));
