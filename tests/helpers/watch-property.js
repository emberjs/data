import Ember from 'ember';
import QUnit from 'qunit';

const { addObserver, removeObserver } = Ember;

function makeCounter() {
  let count = 0;
  const counter = Object.create(null);
  counter.reset = function resetCounter() {
    count = 0;
  };

  Object.defineProperty(counter, 'count', {
    get() {
      return count;
    },
    set() {},
    configurable: false,
    enumerable: true,
  });

  Object.freeze(counter);

  function increment() {
    count++;
  }

  return { counter, increment };
}

export function watchProperty(obj, propertyName) {
  let { counter, increment } = makeCounter();

  function observe() {
    increment();
  }

  addObserver(obj, propertyName, observe);

  function unwatch() {
    removeObserver(obj, propertyName, observe);
  }

  return { counter, unwatch };
}

export function watchProperties(obj, propertyNames) {
  let watched = {};
  let counters = {};

  if (!Array.isArray(propertyNames)) {
    throw new Error(
      `Must call watchProperties with an array of propertyNames to watch, received ${propertyNames}`
    );
  }

  for (let i = 0; i < propertyNames.length; i++) {
    let propertyName = propertyNames[i];

    if (watched[propertyName] !== undefined) {
      throw new Error(`Cannot watch the same property ${propertyName} more than once`);
    }

    let { counter, increment } = makeCounter();
    watched[propertyName] = increment;
    counters[propertyName] = counter;

    addObserver(obj, propertyName, increment);
  }

  function unwatch() {
    Object.keys(watched).forEach(propertyName => {
      removeObserver(obj, propertyName, watched[propertyName]);
    });
  }

  return { counters, unwatch };
}

QUnit.assert.watchedPropertyCounts = function assertWatchedPropertyCount(
  watchedObject,
  expectedCounts,
  label = ''
) {
  if (!watchedObject || !watchedObject.counters) {
    throw new Error(
      'Expected to receive the return value of watchProperties: an object containing counters'
    );
  }

  let counters = watchedObject.counters;

  Object.keys(expectedCounts).forEach(propertyName => {
    let counter = counters[propertyName];
    let expectedCount = expectedCounts[propertyName];
    let assertionText = label;

    if (Array.isArray(expectedCount)) {
      label = expectedCount[1];
      expectedCount = expectedCount[0];
    }

    assertionText += ` | Expected ${expectedCount} change notifications for ${propertyName} but recieved ${
      counter.count
    }`;

    if (counter === undefined) {
      throw new Error(
        `Cannot assert expected count for ${propertyName} as there is no watcher for that property`
      );
    }

    this.pushResult({
      result: counter.count === expectedCount,
      actual: counter.count,
      expected: expectedCount,
      message: assertionText,
    });
  });
};

QUnit.assert.watchedPropertyCount = function assertWatchedPropertyCount(
  watcher,
  expectedCount,
  label
) {
  let counter;
  if (!watcher) {
    throw new Error(`Expected to receive a watcher`);
  }

  // this allows us to handle watchers passed in from a watchProperties return hash
  if (!watcher.counter && watcher.count !== undefined) {
    counter = watcher;
  } else {
    counter = watcher.counter;
  }

  this.pushResult({
    result: counter.count === expectedCount,
    actual: counter.count,
    expected: expectedCount,
    message: label,
  });
};

QUnit.assert.dirties = function assertDirties(options, updateMethodCallback, label) {
  let { object: obj, property, count } = options;
  count = typeof count === 'number' ? count : 1;
  let { counter, unwatch } = watchProperty(obj, property);
  updateMethodCallback();
  this.pushResult({
    result: counter.count === count,
    actual: counter.count,
    expected: count,
    message: label,
  });
  unwatch();
};
