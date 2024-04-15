// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
const post = store.createRecord('post', { name: 'Krystan rules, you drool' });
// 1
const savedPost = store // 2
  // 3
  .saveRecord(
    // 4
    post // 5
    // 6
  ); // 7
// 8
