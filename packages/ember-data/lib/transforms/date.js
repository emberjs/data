/**
  The `DS.DateTransform` class is used to serialize and deserialize
  date attributes on Ember Data record objects. This transform is used
  when `date` is passed as the type parameter to the
  [DS.attr](../../data#method_attr) function.

  ```javascript
  var attr = DS.attr;
  App.Score = DS.Model.extend({
    value: attr('number'),
    player: DS.belongsTo('player'),
    date: attr('date')
  });
  ```

  @class DateTransform
  @extends DS.Transform
  @namespace DS
 */
DS.DateTransform = DS.Transform.extend({

  deserialize: function(serialized) {
    var type = typeof serialized;

    if (type === "string") {
      return new Date(Ember.Date.parse(serialized));
    } else if (type === "number") {
      return new Date(serialized);
    } else if (serialized === null || serialized === undefined) {
      // if the value is not present in the data,
      // return undefined, not null.
      return serialized;
    } else {
      return null;
    }
  },

  serialize: function(date) {
    if (date instanceof Date) {
      // Serialize it as a number to maintain millisecond precision
      return Number(date);
    } else {
      return null;
    }
  }

});
