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

  // raises is deprecated, but we likely want to keep it around for our es3
  // test runs.
  // taken from emberjs/ember-dev here: http://git.io/sQhl3A
  QUnit.constructor.prototype.raises = QUnit['throws'];
  window.raises = QUnit['throws'];

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

  var o_create = Object.create || (function(){
    function F(){}

    return function(o) {
      if (arguments.length !== 1) {
        throw new Error('Object.create implementation only accepts one parameter.');
      }
      F.prototype = o;
      return new F();
    };
  }());

  // A light class for stubbing
  //
  function MethodCallExpectation(target, property){
    this.target = target;
    this.property = property;
  };

  MethodCallExpectation.prototype = {
    handleCall: function(){
      this.sawCall = true;
      return this.originalMethod.apply(this.target, arguments);
    },
    stubMethod: function(fn){
      var context = this;
      this.originalMethod = this.target[this.property];
      this.target[this.property] = function(){
        return context.handleCall.apply(context, arguments);
      };
    },
    restoreMethod: function(){
      this.target[this.property] = this.originalMethod;
    },
    runWithStub: function(fn){
      try {
        this.stubMethod();
        fn();
      } finally {
        this.restoreMethod();
      }
    },
    assert: function(fn) {
      this.runWithStub();
      ok(this.sawCall, "Expected "+this.property+" to be called.");
    }
  };

  function AssertExpectation(message){
    MethodCallExpectation.call(this, Ember, 'assert');
    this.expectedMessage = message;
  };
  AssertExpectation.Error = function(){};
  AssertExpectation.prototype = o_create(MethodCallExpectation.prototype);
  AssertExpectation.prototype.handleCall = function(message, test){
    this.sawCall = true;
    if (test) return; // Only get message for failures
    this.actualMessage = message;
    // Halt execution
    throw new AssertExpectation.Error();
  };
  AssertExpectation.prototype.assert = function(fn){
    try {
      this.runWithStub(fn);
    } catch (e) {
      if (!(e instanceof AssertExpectation.Error))
        throw e;
    }

    // Run assertions in an order that is useful when debugging a test failure.
    //
    if (!this.sawCall) {
      ok(false, "Expected Ember.assert to be called (Not called with any value).");
    } else if (!this.actualMessage) {
      ok(false, 'Expected a failing Ember.assert (Ember.assert called, but without a failing test).');
    } else {
      if (this.expectedMessage) {
        if (this.expectedMessage instanceof RegExp) {
          ok(this.expectedMessage.test(this.actualMessage), "Expected failing Ember.assert: '" + this.expectedMessage + "', but got '" + this.actualMessage + "'.");
        } else {
          equal(this.actualMessage, this.expectedMessage, "Expected failing Ember.assert: '" + this.expectedMessage + "', but got '" + this.actualMessage + "'.");
        }
      } else {
        // Positive assertion that assert was called
        ok(true, 'Expected a failing Ember.assert.');
      }
    }
  };

  // Looks for an exception raised within the fn.
  //
  // expectAssertion(function(){
  //   Ember.assert("Homie don't roll like that");
  // } /* , optionalMessageStringOrRegex */);
  //
  window.expectAssertion = function expectAssertion(fn, message){
    (new AssertExpectation(message)).assert(fn);
  };

  EmberDev.deprecations = {
    NONE: 99, // 99 problems and a deprecation ain't one
    expecteds: null,
    actuals: null,
    stubEmber: function(){
      if (!EmberDev.deprecations.originalEmberDeprecate && Ember.deprecate !== EmberDev.deprecations.originalEmberDeprecate) {
        EmberDev.deprecations.originalEmberDeprecate = Ember.deprecate;
      }
      Ember.deprecate = function(msg, test) {
        EmberDev.deprecations.actuals = EmberDev.deprecations.actuals || [];
        EmberDev.deprecations.actuals.push([msg, test]);
      };
    },
    restoreEmber: function(){
      Ember.deprecate = EmberDev.deprecations.originalEmberDeprecate;
    }
  };

  // Expects no deprecation to happen from the time of calling until
  // the end of the test.
  //
  // expectNoDeprecation(/* optionalStringOrRegex */);
  // Ember.deprecate("Old And Busted");
  //
  window.expectNoDeprecation = function(message) {
    if (typeof EmberDev.deprecations.expecteds === 'array') {
      throw("No deprecation was expected after expectDeprecation was called!");
    }
    EmberDev.deprecations.stubEmber();
    EmberDev.deprecations.expecteds = EmberDev.deprecations.NONE;
  };

  // Expect a deprecation to happen within a function, or if no function
  // is pass, from the time of calling until the end of the test. Can be called
  // multiple times to assert deprecations with different specific messages
  // were fired.
  //
  // expectDeprecation(function(){
  //   Ember.deprecate("Old And Busted");
  // }, /* optionalStringOrRegex */);
  //
  // expectDeprecation(/* optionalStringOrRegex */);
  // Ember.deprecate("Old And Busted");
  //
  window.expectDeprecation = function(fn, message) {
    if (EmberDev.deprecations.expecteds === EmberDev.deprecations.NONE) {
      throw("A deprecation was expected after expectNoDeprecation was called!");
    }
    EmberDev.deprecations.stubEmber();
    EmberDev.deprecations.expecteds = EmberDev.deprecations.expecteds || [];
    if (fn && typeof fn !== 'function') {
      // fn is a message
      EmberDev.deprecations.expecteds.push(fn);
    } else {
      EmberDev.deprecations.expecteds.push(message || /.*/);
      if (fn) {
        fn();
        window.assertDeprecation();
      }
    }
  };

  // Forces an assert the deprecations occurred, and resets the globals
  // storing asserts for the next run.
  //
  // expectNoDeprecation(/Old/);
  // setTimeout(function(){
  //   Ember.deprecate("Old And Busted");
  //   assertDeprecation();
  // });
  //
  // assertDeprecation is called after each test run to catch any expectations
  // without explicit asserts.
  //
  window.assertDeprecation = function() {
    var expecteds = EmberDev.deprecations.expecteds,
        actuals   = EmberDev.deprecations.actuals || [];
    if (!expecteds) {
      EmberDev.deprecations.actuals = null;
      return;
    }

    EmberDev.deprecations.restoreEmber();
    EmberDev.deprecations.actuals = null;
    EmberDev.deprecations.expecteds = null;

    if (expecteds === EmberDev.deprecations.NONE) {
      var actualMessages = [];
      for (var actual in actuals) {
        actualMessages.push(actual[0]);
      }
      ok(actuals.length === 0, "Expected no deprecation call, got: "+actualMessages.join(', '));
    } else {
      for (var o=0;o < expecteds.length; o++) {
        var expected = expecteds[o], match;
        for (var i=0;i < actuals.length; i++) {
          var actual = actuals[i];
          if (!actual[1]) {
            if (expected instanceof RegExp) {
              if (expected.test(actual[0])) {
                match = actual;
                break;
              }
            } else {
              if (expected === actual[0]) {
                match = actual;
                break;
              }
            }
          }
        }

        if (!actual)
          ok(false, "Recieved no deprecate calls at all, expecting: "+expected);
        else if (match && !match[1])
          ok(true, "Recieved failing deprecation with message: "+match[0]);
        else if (match && match[1])
          ok(false, "Expected failing deprecation, got succeeding with message: "+match[0]);
        else if (actual[1])
          ok(false, "Did not receive failing deprecation matching '"+expected+"', last was success with '"+actual[0]+"'");
        else if (!actual[1])
          ok(false, "Did not receive failing deprecation matching '"+expected+"', last was failure with '"+actual[0]+"'");
      }
    }
  };
})();
