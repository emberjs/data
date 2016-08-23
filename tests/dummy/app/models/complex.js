import DS from 'ember-data';

const {
  attr,
  belongsTo,
  hasMany,
  Model
} = DS;

export default Model.extend({
  name: attr(),
  description: attr(),
  baz: belongsTo('baz', { inverse: 'complex', async: false }),
  foos: hasMany('foo', { inverse: 'complex', async: false })
});
