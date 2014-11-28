var name = 'Ember.Object.create';

function fn() {
 return Klass.create();
}

module.exports.fn    = fn;
module.exports.name  = name;
module.exports.setup = function() {
  var Klass;
  if (this.distribution === 0) {
    Klass = Ember.Object.extend({});
  } else if (this.distribution === 1) {
    Klass = Ember.Object.extend({
      firstName: Ember.computed(function() { })
    });
  } else if (this.distribution === 5) {
    Klass = Ember.Object.extend({
      firstName:  Ember.computed(function() { }),
      lastName:   Ember.computed(function() { }),
      middleName: Ember.computed(function() { }),
      age:        Ember.computed(function() { }),
      preference: Ember.computed(function() { })
    });
  }
};
