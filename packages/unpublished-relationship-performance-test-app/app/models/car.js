import DS from 'ember-data';

const { Model, belongsTo, hasMany } = DS;

export default Model.extend({
  make: belongsTo('make', { async: false, inverse: 'cars' }),
  size: belongsTo('size', { async: false, inverse: 'cars' }),
  colors: hasMany('color', { async: false, inverse: 'cars' }),
});
