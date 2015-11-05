// A light class for stubbing
//
export default function MethodCallExpectation(target, property, testAssert) {
  this.target = target;
  this.property = property;
  this.testAssert = testAssert;
}

MethodCallExpectation.prototype = {
  handleCall: function() {
    this.sawCall = true;
    return this.originalMethod.apply(this.target, arguments);
  },
  stubMethod: function(fn) {
    var context = this;
    this.originalMethod = this.target[this.property];
    this.target[this.property] = function() {
      return context.handleCall.apply(context, arguments);
    };
  },
  restoreMethod: function() {
    this.target[this.property] = this.originalMethod;
  },
  runWithStub: function(fn) {
    try {
      this.stubMethod();
      fn();
    } finally {
      this.restoreMethod();
    }
  },
  assert: function(fn) {
    this.runWithStub();
    this.testAssert.ok(this.sawCall, "Expected "+this.property+" to be called.");
  }
};
