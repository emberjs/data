import { findRecord } from '@ember-data/legacy-compat/builders';
// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
// 1
const { content: post } = await store
  // 2
  .request<Post>(
    findRecord<Post>( // 3
      // 9
      // 10
      {
        // 4
        type: 'post', // 5
        // 6
        id: '1', // 7
        // 8
      }
    )
  ); // 11
// 12
