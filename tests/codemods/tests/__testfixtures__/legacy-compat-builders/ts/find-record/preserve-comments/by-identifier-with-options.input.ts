// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
// 1
const post = await store // 2
  // 3
  .findRecord<Post>(
    // 4
    {
      // 5
      type: 'post', // 6
      // 7
      id: '1', // 8
      // 9
    }, // 10
    // 11
    {
      // 12
      reload: true, // 13
      // 14
    } // 15
    // 16
  ); // 17
// 18
