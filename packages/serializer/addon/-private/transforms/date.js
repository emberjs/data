import Transform from './transform';

/**
  @module @ember-data/serializer
*/

/**
 The `DateTransform` class is used to serialize and deserialize
 date attributes on Ember Data record objects. This transform is used
 when `date` is passed as the type parameter to the
 [attr](/ember-data/release/functions/@ember-data%2Fmodel/attr) function. It uses the [`ISO 8601`](https://en.wikipedia.org/wiki/ISO_8601)
 standard.

 ```app/models/score.js
 import Model, { attr, belongsTo } from '@ember-data/model';

 export default class ScoreModel extends Model {
    @attr('number') value;
    @belongsTo('player') player;
    @attr('date') date;
  }
 ```

 @class DateTransform
  @public
 @extends Transform
 */

export default Transform.extend({
  deserialize(serialized) {
    let type = typeof serialized;

    if (type === 'string') {
      let offset = serialized.indexOf('+');

      if (offset !== -1 && serialized.length - 5 === offset) {
        offset += 3;
        return new Date(serialized.slice(0, offset) + ':' + serialized.slice(offset));
      }
      return new Date(serialized);
    } else if (type === 'number') {
      return new Date(serialized);
    } else if (serialized === null || serialized === undefined) {
      // if the value is null return null
      // if the value is not present in the data return undefined
      return serialized;
    } else {
      return null;
    }
  },

  serialize(date) {
    if (date instanceof Date && !isNaN(date)) {
      return date.toISOString();
    } else {
      return null;
    }
  },
});
