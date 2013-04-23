var Evented = Ember.Evented,              // ember-runtime/mixins/evented
    run = Ember.run,                      // ember-metal/run-loop
    get = Ember.get;                      // ember-metal/accessors

var LoadPromise = Ember.Mixin.create(Evented, {
  init: function() {
    this._super.apply(this, arguments);
    this.one('didLoad', function() {
      var self = this;

      run(function(){
        self.resolve();
      });
    });

    if (get(this, 'isLoaded')) {
      this.trigger('didLoad');
    }
  },

  then: function(success, failure){
    var self = this;
    return get(this, '_deferred').promise.then(function() {
      return success(self);
    }, function(reason) {
      return failure(reason);
    });
  },

  resolve: function() {
    // the record's promise resolves to itself
    // (although no resolution value is needed,
    // the Promises/A+ spec states that a promise must
    // have a fulfillment value)
    get(this, '_deferred').resolve(get(this, '_deferred').promise);
  },

  _deferred: Ember.computed(function(){
    return new Ember.RSVP.defer();
  })
});

DS.LoadPromise = LoadPromise;
