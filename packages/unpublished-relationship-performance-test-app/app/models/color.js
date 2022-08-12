import DS from 'ember-data';

const { Model, attr, hasMany } = DS;

export default Model.extend({
  name: attr('string'),
  cars: hasMany('car', { async: false, inverse: 'colors' }),
});
