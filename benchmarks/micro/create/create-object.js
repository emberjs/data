var name = 'Ember.Object.create';

function fn() {
 return this.data.klass.create();
}

module.exports.fn    = fn;
module.exports.name  = name;
module.exports.setup = function() {
  if (this.distribution === 0) {
    this.data = {
      klass: Ember.Object.extend({})
    };
  } else if (this.distribution === 1) {
    this.data = {
      klass: Ember.Object.extend({
        firstName: Ember.computed(function() { })
      })
    };
  } else if (this.distribution === 5) {
    this.data = {
      klass: Ember.Object.extend({
        firstName:  Ember.computed(function() { }),
        lastName:   Ember.computed(function() { }),
        middleName: Ember.computed(function() { }),
        age:        Ember.computed(function() { }),
        preference: Ember.computed(function() { })
      })
    };
  }
};
