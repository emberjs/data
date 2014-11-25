/*
  Detect if the user has a correct Object.create shim.
  Ember has provided this for a long time but has had an incorrect shim before 1.8
  TODO: Remove for Ember Data 1.0.
*/
var object = Ember.create(null);
if (object.toString !== undefined && Ember.keys(Ember.create({}))[0] === '__proto__'){
  throw new Error("Ember Data requires a correct Object.create shim. You should upgrade to Ember >= 1.8 which provides one for you. If you are using ES5-shim, you should try removing that after upgrading Ember.");
}
