import OrderedSet from './ordered-set';
/**
  @namespace
  @method diffArray
  @private
  @for DS
  @param {Array} oldArray the old array
  @param {Array} newArray the new array
  @return {hash} {
      firstChangeIndex: <integer>,  // null if no change
      addedCount: <integer>,        // 0 if no change
      removedCount: <integer>       // 0 if no change
    }
*/
export function diffArray(oldArray, newArray) {
  const oldLength = oldArray.length;
  const newLength = newArray.length;

  const shortestLength = Math.min(oldLength, newLength);
  let firstChangeIndex = null; // null signifies no changes

  // find the first change
  for (let i=0; i<shortestLength; i++) {
    // compare each item in the array
    if (oldArray[i] !== newArray[i]) {
      firstChangeIndex = i;
      break;
    }
  }

  if (firstChangeIndex === null && newLength !== oldLength) {
    // no change found in the overlapping block
    // and array lengths differ,
    // so change starts at end of overlap
    firstChangeIndex = shortestLength;
  }

  let addedCount = 0;
  let removedCount = 0;
  if (firstChangeIndex !== null) {
    // we found a change, find the end of the change
    let unchangedEndBlockLength = shortestLength - firstChangeIndex;
    // walk back from the end of both arrays until we find a change
    for (let i=1; i<=shortestLength; i++) {
      // compare each item in the array
      if (oldArray[oldLength-i] !== newArray[newLength-i]) {
        unchangedEndBlockLength = i-1;
        break;
      }
    }
    addedCount = newLength - unchangedEndBlockLength - firstChangeIndex;
    removedCount = oldLength - unchangedEndBlockLength - firstChangeIndex;
  }

  return {
    firstChangeIndex,
    addedCount,
    removedCount
  };
}

export function setForArray(array) {
  let set = new OrderedSet();

  if (array) {
    for (let i=0, l=array.length; i<l; i++) {
      set.add(array[i]);
    }
  }

  return set;
}

export function computeChanges(oldArray, newArray, removalSet) {
  let changeset = {
    changes: false,
    additions: [],
    removals: []
  };

  let diff = diffArray(oldArray, newArray);

  if (diff.firstChangeIndex === null) {
    // no changes found
    if (removalSet) {
      // records that have been removed since last compute will need their inverses to be corrected
      for (let i = 0, l = newArray.length; i < l; i++) {
        let record = newArray[i];
        if (removalSet.has(record)) {
          changeset.changes = true;
          break;
        }
      }
    }

    return changeset;
  }

  let removedMembersSet = setForArray(oldArray.slice(diff.firstChangeIndex, diff.firstChangeIndex + diff.removedCount));
  let changeBlockSet = setForArray(newArray.slice(diff.firstChangeIndex, diff.firstChangeIndex + diff.addedCount));

  // remove members that were removed but not re-added
  removedMembersSet.forEach(member => {
    if (!changeBlockSet.has(member)) {
      changeset.removals.push(member);
    }
  });

  let flushCanonicalLater = false;

  // --- deal with records before the change block
  if (removalSet) {
    // records that have been removed since last compute will need their inverses to be corrected
    for (let i = 0; i < diff.firstChangeIndex; i++) {
      let record = newArray[i];
      if (removalSet.has(record)) {
        changeset.changes = true;
        break;
      }
    }
  }

  // --- deal with records in the change block
  for (let i = diff.firstChangeIndex, l = diff.firstChangeIndex + diff.addedCount; i < l; i++) {
    let record = newArray[i];
    if (oldArray[i] !== record) {
      changeset.changes = true;
      if (removedMembersSet.has(record)) {
        // this is a reorder
        changeset.removals.push(record);
      }
      // reorder or insert
      changeset.additions.push(record, i);
    }
  }

  // --- deal with records after the change block
  if (!flushCanonicalLater && removalSet) {
    // records that have been removed since last compute will need their inverses to be corrected
    for (let i = diff.firstChangeIndex + diff.addedCount, l = newArray.length; i < l; i++) {
      let record = newArray[i];
      if (removalSet.has(record)) {
        changeset.changes = true;
        break;
      }
    }
  }

  return changeset;
}

export default diffArray;
