import DS from 'ember-data';

const {
  attr,
  belongsTo,
  Model
} = DS;

export default Model.extend({
  name: attr(),
  description: attr(),
  complex: belongsTo('complex', { inverse: 'baz', async: false }),
  heavyFoo: belongsTo('heavy-foo', { inverse: 'baz', async: false })
});
