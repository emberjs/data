/**
 * Creates a `parent` with `nrChildren` children and each `child` has `nrFriends` friends.
 * If `nrFriends > 0` then each child also has a `bestFriend` and a `secondBestFriend`.
 */
const createParentRecords = require('./create-parent-records');

module.exports = function createParentPayload(nrChildren = 0, nrFriends = 0) {
  return createParentRecords(1, nrChildren, nrFriends);
};
