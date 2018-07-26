/* global Proxy */
import QUnit, { test } from 'qunit';

export default function todo(description, callback) {
  test(`[TODO] ${description}`, async function todoTest(assert) {
    let todos = [];
    hijackAssert(assert, todos);

    await callback.call(this, assert);

    assertTestStatus(assert, todos);
  });
}

function hijackAssert(assert, todos) {
  const pushResult = assert.pushResult;

  assert.pushResult = function hijackedPushResult(assertion) {
    let result = assertion.result;
    if (!assertion.isTodo && result === false) {
      assertion.message = `[REGRESSION ENCOUNTERED] ${assertion.message}`;
    }

    return pushResult.call(assert, assertion);
  };
  let handler = {
    get(target, propKey /*, receiver*/) {
      const origMethod = target[propKey];

      if (typeof origMethod === 'function' && propKey === 'pushResult') {
        return function captureResult(assertion) {
          let result = assertion.result;
          assertion.isTodo = true;
          assertion.message = `[TODO ${result === true ? 'COMPLETED' : 'INCOMPLETE'}] ${
            assertion.message
          }`;

          todos.push(assertion);
          origMethod.call(target, assertion);
        };
      } else {
        return origMethod;
      }
    },
  };

  assert.todo = new Proxy(assert, handler);
}

function assertTestStatus(assert, todos) {
  assert.todo = false;
  const totalTodoFailures = todos.reduce((c, r) => {
    return r.result === false ? c + 1 : c;
  }, 0);
  const results = QUnit.config.current.assertions;
  const totalFailures = results.reduce((c, r) => {
    return r.result === false ? c + 1 : c;
  }, 0);
  const hasNonTodoFailures = totalFailures > totalTodoFailures;
  const hasSomeCompletedTodos = totalTodoFailures < todos.length;
  const totalWasMet = assert.test.expected === null || assert.test.expected === results.length;
  const todoIsComplete = totalWasMet && totalTodoFailures === 0;

  if (todoIsComplete) {
    assert.pushResult({
      isTodo: true,
      actual: true,
      expected: false,
      message:
        '[TODO COMPLETED] This TODO is now complete (all "todo" assertions pass) and MUST be converted from todo() to test()',
      result: false,
    });
  } else if (hasNonTodoFailures) {
    assert.pushResult({
      isTodo: true,
      actual: false,
      expected: true,
      message:
        '[REGRESSION MUST-FIX] This TODO is has regressed (a non "todo" assertion has failed) and MUST be fixed',
      result: false,
    });
  } else if (hasSomeCompletedTodos) {
    assert.pushResult({
      isTodo: true,
      actual: false,
      expected: true,
      message:
        '[TODOS COMPLETED] Some assert.todos assertions have been completed and MUST now be converted from assert.todo to assert.',
      result: false,
    });
  } else {
    assert.test.skip = true;
    assert.test.testReport.skipped = true;
  }
}
