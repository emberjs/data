var name = 'create record';

function fn() {
  return Klass._create();
}

module.exports.fn    = fn;
module.exports.name  = name;
module.exports.setup = function() {
  var Klass;
  if (this.distribution === 0) {
    Klass = DS.Model.extend({});
  } else if (this.distribution === 1) {
    Klass = DS.Model.extend({
      firstName: DS.attr()
    });
  } else if (this.distribution === 5) {
    Klass = DS.Model.extend({
      firstName: DS.attr(),
      lastName: DS.attr(),
      middleName: DS.attr(),
      age: DS.attr(),
      preference: DS.attr()
    });
  }
}
