var name = 'create record';

var Person = DS.Model({

});

function fn() {
  return this.data.klass._create();
}

module.exports.fn    = fn;
module.exports.name  = name;
module.exports.setup = function() {
  if (this.distribution === 0) {
    this.data = {
      klass: DS.Model.extend({})
    };
  } else if (this.distribution === 1) {
    this.data = {
      klass: DS.Model.extend({
        firstName: DS.attr()
      })
    };
  } else if (this.distribution === 5) {
    this.data = {
      klass: DS.Model.extend({
        firstName: DS.attr(),
        lastName: DS.attr(),
        middleName: DS.attr(),
        age: DS.attr(),
        preference: DS.attr()
      })
    };
  }
}
