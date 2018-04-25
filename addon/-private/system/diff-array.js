/**
  @namespace
  @method diffArray
  @private
  @param {Array} oldArray the old array
  @param {Array} newArray the new array
  @return {hash} {
      firstChangeIndex: <integer>,  // null if no change
      addedCount: <integer>,        // 0 if no change
      removedCount: <integer>       // 0 if no change
    }
*/
export default function diffArray(oldArray, newArray) {
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
