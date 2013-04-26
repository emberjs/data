var Evented = Ember.Evented,              // ember-runtime/mixins/evented
    Deferred = Ember.DeferredMixin,       // ember-runtime/mixins/evented
    run = Ember.run,                      // ember-metal/run-loop
    get = Ember.get;                      // ember-metal/accessors

var LoadPromise = Ember.Mixin.create(Evented, Deferred, {
  init: function() {
    this._super.apply(this, arguments);
    this.one('didLoad', function() {
      var deferred, promise;

      deferred = get(this, '_deferred');
      promise = deferred.promise;

      run(this, 'resolve', promise);
    });

    if (get(this, 'isLoaded')) {
      this.trigger('didLoad');
    }
  }
});

DS.LoadPromise = LoadPromise;
