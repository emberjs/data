(function() {
  window.EmberDev = window.EmberDev || {};

  EmberDev.afterEach = function() {
      if (Ember && Ember.View) {
        var viewIds = [], id;
        for (id in Ember.View.views) {
          if (Ember.View.views[id] != null) {
            viewIds.push(id);
          }
        }

        if (viewIds.length > 0) {
          deepEqual(viewIds, [], "Ember.View.views should be empty");
          Ember.View.views = [];
        }
      }

      if (Ember && Ember.TEMPLATES) {
        var templateNames = [], name;
        for (name in Ember.TEMPLATES) {
          if (Ember.TEMPLATES[name] != null) {
            templateNames.push(name);
          }
        }

        if (templateNames.length > 0) {
          deepEqual(templateNames, [], "Ember.TEMPLATES should be empty");
          Ember.TEMPLATES = {};
        }
      }
    };

   window.globalFailedTests  = [];
      window.globalTestResults = null;
      window.lastAssertionTime = new Date().getTime();

      var currentTest, assertCount;

      QUnit.testStart(function(data) {
        // Reset the assertion count
        assertCount = 0;

        currentTest = {
          name: data.name,
          failedAssertions: [],
          total: 0,
          passed: 0,
          failed: 0,
          start: new Date(),
          time: 0
        };

      })

      QUnit.log(function(data) {
        assertCount++;
        lastAssertionTime = new Date().getTime();

        // Ignore passing assertions
        if (!data.result) {
          currentTest.failedAssertions.push(data);
        }
      });

      QUnit.testDone(function(data) {
        currentTest.time = (new Date()).getTime() - currentTest.start.getTime();  // ms
        currentTest.total = data.total;
        currentTest.passed = data.passed;
        currentTest.failed = data.failed;

        if (currentTest.failed > 0)
          window.globalFailedTests.push(currentTest)

        currentTest = null;
      });

      QUnit.done(function( details ) {
        details.failedTests = globalFailedTests;

        window.globalTestResults = details;
      });

  // hack qunit to not suck for Ember objects
  var originalTypeof = QUnit.jsDump.typeOf;

  QUnit.jsDump.typeOf = function(obj) {
    if (Ember && Ember.Object && Ember.Object.detectInstance(obj)) {
      return "emberObject";
    }

    return originalTypeof.call(this, obj);
  };

  QUnit.jsDump.parsers.emberObject = function(obj) {
    return obj.toString();
  };

  var originalModule = module;
  module = function(name, origOpts) {
    var opts = {};
    if (origOpts && origOpts.setup) { opts.setup = origOpts.setup; }
    opts.teardown = function() {
      if (origOpts && origOpts.teardown) { origOpts.teardown(); }

      if (Ember && Ember.run) {
        if (Ember.run.currentRunLoop) {
          ok(false, "Should not be in a run loop at end of test");
          while (Ember.run.currentRunLoop) {
            Ember.run.end();
          }
        }
        if (Ember.run.hasScheduledTimers()) {
          // Use `ok` so we get full description.
          // Gate inside of `if` so that we don't mess up `expects` counts
          ok(false, "Ember run should not have scheduled timers at end of test");
          Ember.run.cancelTimers();
        }
      }

      if (EmberDev.afterEach) {
        EmberDev.afterEach();
      }
    };
    return originalModule(name, opts);
  };

  // Tests should time out after 5 seconds
  QUnit.config.testTimeout = 5000;

  // Handle JSHint
  QUnit.config.urlConfig.push('nojshint');

  EmberDev.jsHint = !QUnit.urlParams.nojshint;

  EmberDev.jsHintReporter = function (file, errors) {
    if (!errors) { return ''; }

    var len = errors.length,
        str = '',
        error, idx;

    if (len === 0) { return ''; }

    for (idx=0; idx<len; idx++) {
      error = errors[idx];
      str += file  + ': line ' + error.line + ', col ' +
          error.character + ', ' + error.reason + '\n';
    }

    return str + "\n" + len + ' error' + ((len === 1) ? '' : 's');
  };

  // Add `expectAssertion` which replaces
  // `raises` to detect uncatchable assertions
  function expectAssertion(fn, expectedMessage) {
    var originalAssert = Ember.assert,
      actualMessage, actualTest,
      arity, sawAssertion;

    var AssertionFailedError = new Error('AssertionFailed');

    try {
      Ember.assert = function(message, test) {
        arity = arguments.length;
        actualMessage = message;
        actualTest = test;

        if (!test) {
          throw AssertionFailedError;
        }
      };

      try {
        fn();
      } catch(error) {
        if (error === AssertionFailedError) {
          sawAssertion = true;
        } else {
          throw error;
        }
      }

      if (!sawAssertion) {
        ok(false, "Expected Ember.assert: '" + expectedMessage + "', but no assertions were run");
      } else if (arity === 2) {

        if (expectedMessage) {
          if (expectedMessage instanceof RegExp) {
            ok(expectedMessage.test(actualMessage), "Expected Ember.assert: '" + expectedMessage + "', but got '" + actualMessage + "'");
          }else{
            equal(actualMessage, expectedMessage, "Expected Ember.assert: '" + expectedMessage + "', but got '" + actualMessage + "'");
          }
        } else {
          ok(!actualTest);
        }
      } else if (arity === 1) {
        ok(!actualTest);
      } else {
        ok(false, 'Ember.assert was called without the assertion');
      }

    } finally {
      Ember.assert = originalAssert;
    }
  }

  window.expectAssertion = expectAssertion;

  Ember.assert = function(msg, test) {
        // only assert on failure
    //     // to not change number of assertions
             if (!test) {
                   ok(false, 'Assertion failed: ' + msg);
                       }
                         }
})();
