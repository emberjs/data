import Model, { attr, hasMany } from '@ember-data/model';

export default Model.extend({
  parentName: attr('string'),
  children: hasMany('child', { async: true, inverse: 'parent' }),
});
