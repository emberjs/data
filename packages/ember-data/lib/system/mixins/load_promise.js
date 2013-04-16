var DeferredMixin = Ember.DeferredMixin,  // ember-runtime/mixins/deferred
    Evented = Ember.Evented,              // ember-runtime/mixins/evented
    run = Ember.run,                      // ember-metal/run-loop
    get = Ember.get;                      // ember-metal/accessors

var LoadPromise = Ember.Mixin.create(Evented, DeferredMixin, {
  init: function() {
    this._super.apply(this, arguments);
    this.one('didLoad', function() {
      run(this, 'resolve', this);
    });

    if (get(this, 'isLoaded')) {
      this.trigger('didLoad');
    }
  }
});

DS.LoadPromise = LoadPromise;
