import DS from 'ember-data';

const { Model, attr, belongsTo, hasMany } = DS;

export default Model.extend({
  childName: attr('string'),
  friends: hasMany('child', { async: true }),
  bestFriend: belongsTo('child', { async: true }),
  secondBestFriend: belongsTo('child', { async: true }),
  parent: belongsTo('parent', { async: true }),
});
