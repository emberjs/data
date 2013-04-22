DS.Errors = Ember.Object.extend({
  add: function(property, value) {
    this.set(property, (this.get(property) || []).concat(value));
  },
  clear: function() {
    var keys = Object.keys(this);
    var only = null;
    if ( arguments.length > 1 )
    {
      only = Array.prototype.slice.apply(arguments);
    }
    else
    {
      if (arguments.length === 1)
      {
        if ( arguments[0] instanceof Array )
        {
          only = arguments[0];
        } else
        {
          only = [arguments[0]];
        }
      }
    }
    for(var i = 0; i < keys.length; i++) {
      if ( only && only.indexOf(keys[i]) < 0 )
      {
        continue;
      }
      this.set(keys[i], undefined);
      delete this[keys[i]];
    }
  }
});
