import DS from 'ember-data';

const {
  attr,
  belongsTo,
  Model
} = DS;

export default Model.extend({
  name: attr(),
  description: attr(),
  heavy: belongsTo('heavy', { inverse: 'heavyFoos', async: false }),
  baz: belongsTo('baz', { inverse: 'heavyFoo', async: false })
});
