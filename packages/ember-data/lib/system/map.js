/*
 The Map/MapWithDefault code has been in flux as we try
 to catch up with ES6. This is difficult as we support multiple
 versions of Ember.
 This file is currently here in case we have to polyfill ember's code
 across a few releases. As ES6 comes to a close we should have a smaller
 and smaller gap in implementations between Ember releases.
*/
var Map            = Ember.Map;
var MapWithDefault = Ember.MapWithDefault;

export default Map;
export {Map, MapWithDefault};
