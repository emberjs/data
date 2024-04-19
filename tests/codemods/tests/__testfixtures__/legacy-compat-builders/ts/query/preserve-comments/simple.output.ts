import { query } from '@ember-data/legacy-compat/builders';
// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
// 1
const { content: post } = await store // 2
  // 3
  .request<Post[]>(
    query<Post>( // 4
      'post', // 5
      // 6
      // 10
      {
        // 7
        id: '1', // 8
        // 9
      }
    )
  ); // 11
// 12
