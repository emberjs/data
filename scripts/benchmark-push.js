/* eslint-disable no-console */
function makeArray(arrSize = 100_000) {
  return new Array(arrSize).fill((i) => {
    `${i}`;
  });
}

// make this match current
const SLICE_BATCH_SIZE = 4761;
function fastPush(target, source) {
  let startLength = 0;
  const newLength = source.length;
  while (newLength - startLength > SLICE_BATCH_SIZE) {
    target.push.apply(target, source.slice(startLength, startLength + SLICE_BATCH_SIZE));
    startLength += SLICE_BATCH_SIZE;
  }
  target.push.apply(target, source.slice(startLength));
}
function newFastPush(target, source) {
  let batch;
  while (source.length > SLICE_BATCH_SIZE) {
    batch = source.splice(0, SLICE_BATCH_SIZE);
    target.push(...batch);
  }
  target.push(...source);
}

function testConcat(iterations, size) {
  let arrs = new Array(iterations).fill(makeArray(size));
  let results = [];
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    let arr = arrs[i];
    let result = [].concat(arr);
    results.push(result);
  }
  let end = performance.now();
  return {
    start,
    end,
    iterations,
    results,
    ops: iterations / (end - start),
  };
}

function testPush(iterations, size) {
  let arrs = new Array(iterations).fill(makeArray(size));
  let results = [];
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    let arr = arrs[i];
    let result = [];
    for (let i = 0; i < arr.length; i++) {
      result.push(arr[i]);
    }
    results.push(result);
  }
  let end = performance.now();
  return {
    start,
    end,
    iterations,
    results,
    ops: iterations / (end - start),
  };
}

function testFastPush(iterations, size) {
  let arrs = new Array(iterations).fill(makeArray(size));
  let results = [];
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    let arr = arrs[i];
    let result = [];
    fastPush(result, arr);
    results.push(result);
  }
  let end = performance.now();
  return {
    start,
    end,
    iterations,
    results,
    ops: iterations / (end - start),
  };
}

function testPushSpread(iterations, size) {
  let arrs = new Array(iterations).fill(makeArray(size));
  let results = [];
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    let arr = arrs[i];
    let result = [].push(...arr);
    results.push(result);
  }
  let end = performance.now();
  return {
    start,
    end,
    iterations,
    results,
    ops: iterations / (end - start),
  };
}

function testPushApply(iterations, size) {
  let arrs = new Array(iterations).fill(makeArray(size));
  let results = [];
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    let arr = arrs[i];
    let result = Array.prototype.push.apply([], arr);
    results.push(result);
  }
  let end = performance.now();
  return {
    start,
    end,
    iterations,
    results,
    ops: iterations / (end - start),
  };
}

function testReflect(iterations, size) {
  let arrs = new Array(iterations).fill(makeArray(size));
  let results = [];
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    let arr = arrs[i];
    let result = Reflect.apply(Array.prototype.push, [], arr);
    results.push(result);
  }
  let end = performance.now();
  return {
    start,
    end,
    iterations,
    results,
    ops: iterations / (end - start),
  };
}

function testSliceChunk(iterations, size) {
  let arrs = new Array(iterations).fill(makeArray(size));
  let results = [];
  let start = performance.now();
  const batchSize = 1200;
  for (let i = 0; i < iterations; i++) {
    let arr = arrs[i];
    let startLength = 0;
    let newLength = arr.length;
    let result = [];
    let batch;
    while (newLength - startLength > batchSize) {
      batch = arr.slice(startLength, batchSize);
      result.push(...batch);
      startLength += batchSize;
    }
    batch = arr.slice(startLength);
    result.push(...batch);
    results.push(result);
  }
  let end = performance.now();
  return {
    start,
    end,
    iterations,
    results,
    ops: iterations / (end - start),
  };
}

function testNewFastPush(iterations, size) {
  let arrs = new Array(iterations).fill(makeArray(size));
  let results = [];
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    let arr = arrs[i];
    let result = [];
    newFastPush(result, arr);
    results.push(result);
  }
  let end = performance.now();
  return {
    start,
    end,
    iterations,
    results,
    ops: iterations / (end - start),
  };
}

function testSliceChunk(iterations, size) {
  let arrs = new Array(iterations).fill(makeArray(size));
  let results = [];
  let start = performance.now();
  const batchSize = SLICE_BATCH_SIZE;
  for (let i = 0; i < iterations; i++) {
    let arr = arrs[i];
    let startLength = 0;
    let newLength = arr.length;
    let result = [];
    let batch;
    while (newLength - startLength > batchSize) {
      batch = arr.slice(startLength, startLength + batchSize);
      result.push(...batch);
      startLength += batchSize;
    }
    batch = arr.slice(startLength);
    result.push(...batch);
    results.push(result);
  }
  let end = performance.now();
  return {
    start,
    end,
    iterations,
    results,
    ops: iterations / (end - start),
  };
}

function testSpliceChunk(iterations, size) {
  let arrs = new Array(iterations).fill(makeArray(size));
  let results = [];
  let start = performance.now();
  const batchSize = SLICE_BATCH_SIZE;
  for (let i = 0; i < iterations; i++) {
    let arr = arrs[i];
    let result = [];
    let batch;
    while (arr.length > batchSize) {
      batch = arr.splice(0, batchSize);
      result.push(...batch);
    }
    result.push(...arr);
    results.push(result);
  }
  let end = performance.now();
  return {
    start,
    end,
    iterations,
    results,
    ops: iterations / (end - start),
  };
}

function testSplice(iterations, size) {
  let arrs = new Array(iterations).fill(makeArray(size));
  let results = [];
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    let arr = arrs[i];
    let result = [];

    arr.unshift(0);
    arr.unshift(result.length);
    Array.prototype.splice.apply(result, arr);
    results.push(result);
  }
  let end = performance.now();
  return {
    start,
    end,
    iterations,
    results,
    ops: iterations / (end - start),
  };
}

const ARR_SIZES = [100, 1000, 10_000, 100_000, 1_000_000, 10_000_000];
function runTests(count) {
  for (const size of ARR_SIZES) {
    console.log(`\n\n\n============ Array<{ ${size.toLocaleString()} }> ============`);
    let result = testConcat(count);
    // let { start, end, iterations } = result;
    // console.log({ start, end, iterations });
    console.log(`\n\tArray.concat\t${result.ops} ops/ms`);

    // result = testPushSpread(count);
    // console.log(`\n\tArray.push(...)\t${result.ops} ops/ms`);

    // result = testPush(count);
    // console.log(`\n\tArray.push(1)\t${result.ops} ops/ms`);

    // result = testFastPush(count);
    // console.log(`\n\tfastPush\t${result.ops} ops/ms`);

    // result = testPushApply(count);
    // console.log(`\n\tArray.push.apply\t${result.ops} ops/ms`);

    // result = testReflect(count);
    // console.log(`\n\tReflect.apply\t${result.ops} ops/ms`);

    result = testNewFastPush(count);
    console.log(`\n\tnewFastPush\t${result.ops} ops/ms`);

    // result = testSliceChunk(count);
    // console.log(`\n\tArray.slice (chunks)\t${result.ops} ops/ms`);

    // result = testSpliceChunk(count);
    // console.log(`\n\tArray.splice (chunks)\t${result.ops} ops/ms`);

    // result = testSplice(count);
    // console.log(`\n\tArray.splice\t${result.ops} ops/ms`);
  }
}

runTests(100);
