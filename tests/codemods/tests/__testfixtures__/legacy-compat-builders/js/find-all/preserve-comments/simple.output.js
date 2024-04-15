import { findAll } from '@ember-data/legacy-compat/builders';
// NOTE: Ideally the comment order and positioning would be unchanged, but due to limitations in recast, this doesn't seem possible
// 1
const post = store // 2
  // 3
  .request(
    findAll(
      // 4
      // 5
      'post'
    )
  ).content; // 6
// 7
