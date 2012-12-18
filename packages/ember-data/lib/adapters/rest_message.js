/**
  This class handles the serialization/deserialization of 
  a JSON message. This functionality was implemented in the
  standard DS.RESTAdapter, but has now been extracted from
  there and placed in this separate class, so as to enable
  easy implementation of custom message structures by means
  of subclassing this class. The DS.RESTAdapter delegates
  the building of a JSON message structure to this class.
  Serialization in Ember Data was done in two places:
  - 1) Serialization of the records has been delegated to
       a separate DS.Serialization class.
  - 2) The JSON message exchanged with the server contains
       more than just the serialized records. The DS.RESTAdapter
       wraps the records in a hash under a name derived from
       the type (using the rootForType() function). 
  This wrapping has now been delegated to the DS.RESTMessage 
  class. Not all REST services apply such wrapping, though.
*/
DS.RESTMessage = Ember.Object.extend({
  data: null,
  root: null,

  init: function() {
    this._super();
    this.set('data', {});
  },

  getContent: function () {
    return this.get('data')[this.get('root')];
  },

  setContent: function (value) {
    this.get('data')[this.get('root')] = value;
  },

  serialized: function () {
    return this.get('data');
  }
});