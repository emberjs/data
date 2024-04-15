import { saveRecord } from '@ember-data/legacy-compat/builders';
// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
const post = store.createRecord<Post>('post', { name: 'Krystan rules, you drool' });
// 1
const savedPost = store // 2
  // 3
  .request(
    saveRecord(
      // 4
      // 5
      // 6
      post
    )
  ).content; // 7
// 8
