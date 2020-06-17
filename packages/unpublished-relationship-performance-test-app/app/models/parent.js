import DS from 'ember-data';

const { Model, attr, hasMany } = DS;

export default Model.extend({
  parentName: attr('string'),
  children: hasMany('child', { async: true }),
});
