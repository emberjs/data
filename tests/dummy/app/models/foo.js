import DS from 'ember-data';

const {
  attr,
  belongsTo,
  Model
} = DS;

export default Model.extend({
  name: attr(),
  description: attr(),
  complex: belongsTo('complex', { inverse: 'foos', async: false }),
  heavyBaz: belongsTo('heavy-baz', { inverse: 'foos', async: false })
});
