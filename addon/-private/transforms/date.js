import { parseDate } from "ember-data/-private/ext/date";

/**
  The `DS.DateTransform` class is used to serialize and deserialize
  date attributes on Ember Data record objects. This transform is used
  when `date` is passed as the type parameter to the
  [DS.attr](../../data#method_attr) function. It uses the [`ISO 8601`](https://en.wikipedia.org/wiki/ISO_8601)
  standard.

  ```app/models/score.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    value: DS.attr('number'),
    player: DS.belongsTo('player'),
    date: DS.attr('date')
  });
  ```

  @class DateTransform
  @extends DS.Transform
  @namespace DS
 */
import Transform from "ember-data/transform";

export default Transform.extend({
  deserialize(serialized) {
    var type = typeof serialized;

    if (type === "string") {
      return new Date(parseDate(serialized));
    } else if (type === "number") {
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
  }
});
