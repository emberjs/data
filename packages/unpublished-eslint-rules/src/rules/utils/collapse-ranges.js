/*
  return `true` if a number is between or equal to either of two other numbers
  or if the number is directly adjacent to either end
*/
function isBetweenOrAdjacent(num, start, end) {
  return (num >= start && num <= end) || num === start - 1 || num === end + 1;
}

/*
  given an array of ranges (where a range is an array of two numbers [start, end])
  combine any overlapping or adjacent ranges.

  [
    [0, 3],
    [5, 9],
    [2, 4],
    [4, 8],
    [10, 11],
    [18, 25],
    [13, 16],
    [11, 15],
    [17, 17],
  ]

  =>

  [
    [0, 25],
  ]
*/
module.exports = function collapseRanges(ranges) {
  let finalRanges = [];
  for (let i = 0; i < ranges.length; i++) {
    let [start, end] = ranges[i];

    // scan forward for unprocessed ranges
    for (let j = i + 1; j < ranges.length; ) {
      let [nextStart, nextEnd] = ranges[j];
      if (isBetweenOrAdjacent(nextStart, start, end) || isBetweenOrAdjacent(nextEnd, start, end)) {
        start = start > nextStart ? nextStart : start;
        end = end > nextEnd ? end : nextEnd;
        // remove the collapsed range
        ranges.splice(j, 1);
        // invalidate our forward scan
        j = i + 1;
      } else {
        // move forward
        j++;
      }
    }
    finalRanges.push([start, end]);
  }

  return finalRanges;
};
