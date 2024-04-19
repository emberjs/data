import { findAll } from '@ember-data/legacy-compat/builders';
// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
// 1
const { content: post } = await store // 2
  // 3
  .request<Post[]>(
    findAll<Post>( // 4
      // 5
      'post'
    )
  ); // 6
// 7
