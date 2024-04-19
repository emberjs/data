// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
// 1
const post = await store
  // 2
  .findRecord(
    // 3
    {
      // 4
      type: 'post', // 5
      // 6
      id: '1', // 7
      // 8
    } // 9
    // 10
  ); // 11
// 12
