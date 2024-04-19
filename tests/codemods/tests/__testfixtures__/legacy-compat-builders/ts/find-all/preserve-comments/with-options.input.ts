// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
// 1
const post = await store // 2
  // 3
  .findAll<Post>(
    // 4
    'post', // 5
    // 6
    {
      // 7
      reload: true, // 8
      // 9
    } // 10
  ); // 11
// 12
