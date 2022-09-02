import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default Model.extend({
  childName: attr('string'),
  friends: hasMany('child', { async: true, inverse: null }),
  bestFriend: belongsTo('child', { async: true, inverse: 'bestFriend' }),
  secondBestFriend: belongsTo('child', { async: true, inverse: 'secondBestFriend' }),
  parent: belongsTo('parent', { async: true, inverse: 'children' }),
});
