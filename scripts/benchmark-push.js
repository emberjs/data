/* eslint-disable no-console */
function makeArray() {
  return new Array(100000).fill((i) => {
    `${i}`;
  });
}

function testConcat(iterations) {
  let arrs = new Array(iterations).fill(makeArray());
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

function testPush(iterations) {
  let arrs = new Array(iterations).fill(makeArray());
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

function testPushSpread(iterations) {
  let arrs = new Array(iterations).fill(makeArray());
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

function testPushApply(iterations) {
  let arrs = new Array(iterations).fill(makeArray());
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

function testReflect(iterations) {
  let arrs = new Array(iterations).fill(makeArray());
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

function testSliceChunk(iterations) {
  let arrs = new Array(iterations).fill(makeArray());
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

function testSpliceChunk(iterations) {
  let arrs = new Array(iterations).fill(makeArray());
  let results = [];
  let start = performance.now();
  const batchSize = 4500;
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

function runTests(count) {
  let result = testConcat(count);
  let { start, end, iterations } = result;
  console.log({ start, end, iterations });
  console.log(`\n\tArray.concat\t${result.ops} ops/ms`);

  result = testPushSpread(count);
  console.log(`\n\tArray.push(...)\t${result.ops} ops/ms`);

  result = testPush(count);
  console.log(`\n\tArray.push(1)\t${result.ops} ops/ms`);

  result = testPushApply(count);
  console.log(`\n\tArray.push.apply\t${result.ops} ops/ms`);

  result = testReflect(count);
  console.log(`\n\tReflect.apply\t${result.ops} ops/ms`);

  result = testSliceChunk(count);
  console.log(`\n\tArray.slice (chunks)\t${result.ops} ops/ms`);

  result = testSpliceChunk(count);
  console.log(`\n\tArray.splice (chunks)\t${result.ops} ops/ms`);
}

runTests(100);
