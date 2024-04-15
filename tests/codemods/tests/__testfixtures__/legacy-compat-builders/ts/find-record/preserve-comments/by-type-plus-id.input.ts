// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
// 1
const post = store // 2
  // 3
  .findRecord<Post>(
    // 4
    'post', // 5
    // 6
    '1' // 7
  ); // 8
// 9
