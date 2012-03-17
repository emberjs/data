var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

require("ember-data/system/model/model");

DS.Model.reopen({
  _validations: null,
  _loadValidations: function(){
    if ( this._validations != null ){ return this._validations; }
    var record = this, validations = this._validations = Em.A();

    // check all attributes for validation meta
    this.constructor.eachComputedProperty( function(name, meta){
      
      if (meta.isAttribute != true || meta.options.validations == null){ 
        return;
      }
      var value, options = meta.options.validations;
      for (var validation in options) {
        value = options[validation];
        if ( value && 'function' === typeof record[validation]) {
          validations.pushObject({key: name, validation:validation, options: value});
        }
      }
    });
    return this._validations;
  },
  validate: function(){
    var validations = this._loadValidations(), val;
    for (var i = validations.length - 1; i >= 0; i--) {
      val = validations.objectAt(i);
      this[val.validation].call(this, val.key, val.options);
    }
  },
  addError: function(key, value, message){
    var errors = get(this, 'errors') || Ember.Object.create();
    set(errors, key, message);
    set(this, 'errors', errors)
  },
  presence: function(key){
    var value = get(this, key);
    if ( Ember.empty( value ) ) {
      this.addError(key, value, 'presence');
    }
  }
});