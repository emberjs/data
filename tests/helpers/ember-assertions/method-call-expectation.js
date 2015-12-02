// A light class for stubbing
//
export default function MethodCallExpectation(target, property, testAssert) {
  this.target = target;
  this.property = property;
  this.testAssert = testAssert;
}

MethodCallExpectation.prototype = {
  handleCall() {
    this.sawCall = true;
    return this.originalMethod.apply(this.target, arguments);
  },
  stubMethod(fn) {
    var context = this;
    this.originalMethod = this.target[this.property];
    this.target[this.property] = function() {
      return context.handleCall.apply(context, arguments);
    };
  },
  restoreMethod() {
    this.target[this.property] = this.originalMethod;
  },
  runWithStub(fn) {
    try {
      this.stubMethod();
      fn();
    } finally {
      this.restoreMethod();
    }
  },
  assert(fn) {
    this.runWithStub();
    this.testAssert.ok(this.sawCall, "Expected "+this.property+" to be called.");
  }
};
