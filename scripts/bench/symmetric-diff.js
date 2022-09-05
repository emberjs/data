/* eslint-disable no-console */

// make randomly different
function flip() {
  const rand1 = Math.random() < 0.5;
  const rand2 = Math.random() < 0.5;
  return Boolean(rand1 || rand2);
}

function setup(size = 100) {
  let ID = 0;

  const initial = new Array(size).fill(null).map(() => ({ id: `${ID++}` }));
  const final = new Array(size).fill(null).map((v, i) => {
    if (!flip()) {
      return { id: `${ID++}` };
    }
    return initial[i];
  });
  const initialSet = new Set(initial);
  const results = [];

  return {
    initial,
    final,
    initialSet,
    results,
  };
}

function _compare(final, initialSet) {
  let missing = [];

  for (let i = 0; i < final.length; i++) {
    let v = final[i];

    if (!initialSet.has(v)) {
      missing.push(v);
    }
  }
  return missing;
}

function diffArrays(finalState, remoteState, remoteSet) {
  // start with final
  const removed = _compare(finalState, remoteSet);
  const added = _compare(remoteState, new Set(finalState));

  return {
    additions: added,
    removals: removed,
  };
}

function diffSets(initialSet, finalSet) {
  const additions = [];
  const removals = [];

  initialSet.forEach((v) => {
    if (!finalSet.has(v)) {
      removals.push(v);
    }
  });
  finalSet.forEach((v) => {
    if (!initialSet.has(v)) {
      additions.push(v);
    }
  });

  return {
    additions,
    removals,
  };
}

function testFilterIncludes(iterations, size) {
  const { initial, final, initialSet, results } = setup(size);
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    results.push({
      removals: initial.filter((v) => !final.includes(v)),
      additions: final.filter((v) => !initialSet.has(v)),
    });
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

function testSetDiff(iterations, size) {
  const { initial, final, initialSet, results } = setup(size);
  let start = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    let initialL = initial.length;
    let finalL = final.length;
    let longest = initialL > finalL ? initialL : finalL;
    let finalSet = new Set(final);
    let additions = [];
    let removals = [];
    let diff = { additions, removals };

    for (let i = 0; i < longest; i++) {
      if (i < initialL) {
        let v = initial[i];
        if (!finalSet.has(v)) {
          removals.push(v);
        }
      }
      if (i < finalL) {
        let v = final[i];
        if (!initialSet.has(v)) {
          additions.push(v);
        }
      }
    }
    results.push(diff);
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

function testSeparatedDiff(iterations, size) {
  const { initial, final, initialSet, results } = setup(size);
  let start = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    let finalSet = new Set();
    let additions = [];
    let removals = [];
    let diff = { additions, removals };
    for (let i = 0; i < final.length; i++) {
      let v = final[i];
      finalSet.add(v);
      if (!initialSet.has(v)) {
        additions.push(v);
      }
    }
    for (let i = 0; i < initial.length; i++) {
      let v = initial[i];
      if (!finalSet.has(v)) {
        removals.push(v);
      }
    }
    results.push(diff);
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

function testImpl(iterations, size) {
  const { initial, final, initialSet, results } = setup(size);
  let start = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    results.push(diffArrays(final, initial, initialSet));
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

function testImpl2(iterations, size) {
  const { final, initialSet, results } = setup(size);
  let start = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    const finalSet = new Set(final);
    results.push(diffSets(initialSet, finalSet));
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const GC_SLEEP = 1000;
async function runTestSize(count, size) {
  let result;

  result = testFilterIncludes(count, size);
  console.log(`\n\tFilter Includes (${size})\t${result.ops} ops/ms`);
  result = null;
  if (global.gc) {
    global.gc();
  }
  await sleep(GC_SLEEP);

  result = testImpl2(count, size);
  console.log(`\n\tActual Impl2 (${size})\t${result.ops} ops/ms`);
  result = null;
  if (global.gc) {
    global.gc();
  }
  await sleep(GC_SLEEP);

  result = testImpl(count, size);
  console.log(`\n\tActual Impl (${size})\t${result.ops} ops/ms`);
  result = null;
  if (global.gc) {
    global.gc();
  }
  await sleep(GC_SLEEP);

  result = testSetDiff(count, size);
  console.log(`\n\tSet Diff (${size})\t${result.ops} ops/ms`);
  result = null;
  if (global.gc) {
    global.gc();
  }
  await sleep(GC_SLEEP);

  result = testSeparatedDiff(count, size);
  console.log(`\n\tSeparated Set Diff (${size})\t${result.ops} ops/ms`);
  result = null;
  if (global.gc) {
    global.gc();
  }
  await sleep(GC_SLEEP);
  console.log('\n\n');
}

async function runTests(count) {
  await runTestSize(count, 11);
  await runTestSize(count, 101);
  await runTestSize(count, 1001);
  await runTestSize(count, 10001);
  await runTestSize(count, 100001);
}

runTests(100);
