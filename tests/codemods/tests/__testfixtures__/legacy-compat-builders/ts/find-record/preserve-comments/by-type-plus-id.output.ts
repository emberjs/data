import { findRecord } from '@ember-data/legacy-compat/builders';
// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
// 1
const { content: post } = await store // 2
  // 3
  .request<Post>(
    findRecord<Post>( // 4
      'post', // 5
      // 6
      // 7
      '1'
    )
  ); // 8
// 9
