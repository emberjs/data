import { helper } from '@ember/component/helper';
import { addObserver, removeObserver } from '@ember/object/observers';
import { render } from '@ember/test-helpers';

import hbs from 'htmlbars-inline-precompile';
import QUnit from 'qunit';

function freeze(obj) {
  if (typeof Object.freeze === 'function') {
    return Object.freeze(obj);
  }
  return obj;
}

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

  freeze(counter);

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

export async function startWatching() {
  this.set(
    'observe',
    helper(([obj, prop, value]) => {
      obj.watchers[prop]();
    })
  );
  this.set('__watchedObjects', this.__watchedObjects);
  await render(hbs`
  {{#each this.__watchedObjects key="@index" as |obj|}}
    {{#each obj.properties key="@index" as |prop|}}
      {{this.observe obj prop (get obj.context prop)}}
    {{/each}}
  {{/each}}
`);
}

export function watchProperties(obj, propertyNames) {
  let watched = {};
  let counters = {};

  if (!Array.isArray(propertyNames)) {
    throw new Error(`Must call watchProperties with an array of propertyNames to watch, received ${propertyNames}`);
  }

  for (let i = 0; i < propertyNames.length; i++) {
    let propertyName = propertyNames[i];

    if (watched[propertyName] !== undefined) {
      throw new Error(`Cannot watch the same property ${propertyName} more than once`);
    }

    let { counter, increment } = makeCounter();
    watched[propertyName] = increment;
    counters[propertyName] = counter;
  }

  this.__watchedObjects = this.__watchedObjects || [];
  this.__watchedObjects.push({ context: obj, counters, watchers: watched, properties: propertyNames });
  return { counters };
}

QUnit.assert.watchedPropertyCounts = function assertWatchedPropertyCount(watchedObject, expectedCounts, label = '') {
  if (!watchedObject || !watchedObject.counters) {
    throw new Error('Expected to receive the return value of watchProperties: an object containing counters');
  }

  let counters = watchedObject.counters;

  Object.keys(expectedCounts).forEach((propertyName) => {
    let counter = counters[propertyName];
    let expectedCount = expectedCounts[propertyName];
    let assertionText = label;

    if (Array.isArray(expectedCount)) {
      label = expectedCount[1];
      expectedCount = expectedCount[0];
    }

    assertionText += ` | Expected ${expectedCount} change notifications for ${propertyName} but received ${counter.count}`;

    if (counter === undefined) {
      throw new Error(`Cannot assert expected count for ${propertyName} as there is no watcher for that property`);
    }

    this.pushResult({
      result: counter.count === expectedCount,
      actual: counter.count,
      expected: expectedCount,
      message: assertionText,
    });
  });
};

QUnit.assert.watchedPropertyCount = function assertWatchedPropertyCount(watcher, expectedCount, label) {
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
