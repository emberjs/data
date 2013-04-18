var Evented = Ember.Evented,              // ember-runtime/mixins/evented
    run = Ember.run,                      // ember-metal/run-loop
    get = Ember.get;                      // ember-metal/accessors

var LoadPromise = Ember.Mixin.create(Evented, {
  init: function() {
    this._super.apply(this, arguments);
    this.one('didLoad', function() {
      var resolver = get(this, '_deferred.resolve'),
      model = this;

      run(function(){
        resolver(model);
      });
    });

    if (get(this, 'isLoaded')) {
      this.trigger('didLoad');
    }
  },

  then: function(success, failure){
    return get(this, '_deferred').promise.then(success, failure);
  },

  _deferred: Ember.computed(function(){
    return new Ember.RSVP.defer();
  }),
});

DS.LoadPromise = LoadPromise;
