// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
// 1
const post = await store // 2
  // 3
  .query(
    // 4
    'post', // 5
    // 6
    {
      // 7
      id: '1', // 8
      // 9
    } // 10
  ); // 11
// 12
