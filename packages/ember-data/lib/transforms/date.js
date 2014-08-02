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
import Transform from "ember-data/transforms/base";

function pad(num) {
  return num < 10 ? "0"+num : ""+num;
}

export default Transform.extend({

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
      var days = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
      ];
      var months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ];

      var utcYear = date.getUTCFullYear();
      var utcMonth = date.getUTCMonth();
      var utcDayOfMonth = date.getUTCDate();
      var utcDay = date.getUTCDay();
      var utcHours = date.getUTCHours();
      var utcMinutes = date.getUTCMinutes();
      var utcSeconds = date.getUTCSeconds();

      var dayOfWeek = days[utcDay];
      var dayOfMonth = pad(utcDayOfMonth);
      var month = months[utcMonth];

      return dayOfWeek + ", " + dayOfMonth + " " + month + " " + utcYear + " " +
             pad(utcHours) + ":" + pad(utcMinutes) + ":" + pad(utcSeconds) + " GMT";
    } else {
      return null;
    }
  }
});
