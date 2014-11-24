/*
  Detect if the user has a correct Object.create shim.
  Ember has provided this for a long time but has had an incorrect shim before 1.8
  TODO: Remove for Ember Data 1.0.
*/
var object = Ember.create(null);
if (object.toString !== undefined && Ember.keys(Ember.create({})).length !== 0){
  throw new Error("Ember Data requires a correct Object.create shim. You should upgrade to Ember >= 1.8 which provides one for you.");
}
