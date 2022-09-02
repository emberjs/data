import Model, { attr, hasMany } from '@ember-data/model';

export default Model.extend({
  name: attr('string'),
  cars: hasMany('car', { async: false, inverse: 'size' }),
});
