var Evented = Ember.Evented,              // ember-runtime/mixins/evented
    Deferred = Ember.DeferredMixin,       // ember-runtime/mixins/evented
    run = Ember.run,                      // ember-metal/run-loop
    get = Ember.get;                      // ember-metal/accessors

var LoadPromise = Ember.Mixin.create(Evented, Deferred, {
  init: function() {
    this._super.apply(this, arguments);

    this.one('didLoad', this, function() {
      run(this, 'resolve', this);
    });

    this.one('becameError', this, function() {
      run(this, 'reject', this);
    });

    if (get(this, 'isLoaded')) {
      this.trigger('didLoad');
    }
  }
});

DS.LoadPromise = LoadPromise;
