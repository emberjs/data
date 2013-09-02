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
      var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      var pad = function(num) {
        return num < 10 ? "0"+num : ""+num;
      };

      var utcYear = date.getUTCFullYear(),
          utcMonth = date.getUTCMonth(),
          utcDayOfMonth = date.getUTCDate(),
          utcDay = date.getUTCDay(),
          utcHours = date.getUTCHours(),
          utcMinutes = date.getUTCMinutes(),
          utcSeconds = date.getUTCSeconds();


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
