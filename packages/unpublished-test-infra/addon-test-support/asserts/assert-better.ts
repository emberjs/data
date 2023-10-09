import type Assert from 'ember-data-qunit-asserts';

function refFromIndex(index: number, suffix: string): string {
  return `<ref:@${index}${suffix}>`;
}
function getRefForItem<T>(map: Map<T, string>, item: T, index: number): string {
  let ref = map.get(item);
  if (ref === undefined) {
    ref = refFromIndex(index, 'b');
  }
  return ref;
}

export function configureBetterAsserts(assert: Assert) {
  assert.arrayStrictEquals = arrayStrictEquals;
}

function arrayStrictEquals<T>(this: Assert, actual: T[], expected: T[], message: string): void {
  if (!Array.isArray(actual)) {
    this.pushResult({
      result: false,
      actual: false,
      expected: true,
      message: 'Expected the value for "actual" to be an array | ' + message,
    });
    return;
  }
  if (!Array.isArray(expected)) {
    this.pushResult({
      result: false,
      actual: false,
      expected: true,
      message: 'Expected the value for "expected"" to be an array',
    });
    return;
  }
  let passed = actual.length === expected.length;

  let actualRefs = new Map<T, string>();
  let actualSerialized: string[] = actual.map((item, index) => {
    let ref = refFromIndex(index, '');
    actualRefs.set(item, ref);
    return ref;
  });
  let expectedSerialized: string[] = expected.map((item, index) => {
    return getRefForItem(actualRefs, item, index);
  });

  if (passed) {
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) {
        passed = false;
        break;
      }
    }
  }

  this.pushResult({
    result: passed,
    actual: actualSerialized,
    expected: expectedSerialized,
    message,
  });
}
