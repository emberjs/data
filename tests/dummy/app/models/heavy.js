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
  heavyBaz: belongsTo('heavy-baz', { inverse: 'heavy', async: false }),
  heavyFoos: hasMany('heavy-foo', { inverse: 'heavy', async: false })
});
