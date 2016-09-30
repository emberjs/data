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
  heavy: belongsTo('heavy', { inverse: 'heavyBaz', async: false }),
  foos: hasMany('foo', { inverse: 'heavyBaz', async: false})
});
