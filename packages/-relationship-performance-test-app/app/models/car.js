import DS from 'ember-data';

const { Model, belongsTo, hasMany } = DS;

export default Model.extend({
  type: belongsTo('type', { async: false }),
  size: belongsTo('size', { async: false }),
  colors: hasMany('color', { async: false }),
});
