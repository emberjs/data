var DeferredMixin = Ember.DeferredMixin,  // ember-runtime/mixins/deferred
    Evented = Ember.Evented,              // ember-runtime/mixins/evented
    run = Ember.run;                      // ember-metal/run-loop

var LoadPromise = Ember.Mixin.create(Evented, DeferredMixin, {
  init: function() {
    this._super.apply(this, arguments);
    this.one('didLoad', function() {
      run(this, 'resolve', this);
    });
  }
});

DS.LoadPromise = LoadPromise;
