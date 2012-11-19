DS.Transforms = Ember.Object.extend({
  string: {
    fromData: function(serialized) {
      return Ember.none(serialized) ? null : String(serialized);
    },

    toData: function(deserialized) {
      return Ember.none(deserialized) ? null : String(deserialized);
    }
  },

  number: {
    fromData: function(serialized) {
      return Ember.none(serialized) ? null : Number(serialized);
    },

    toData: function(deserialized) {
      return Ember.none(deserialized) ? null : Number(deserialized);
    }
  },

  // Handles the following boolean inputs:
  // "TrUe", "t", "f", "FALSE", 0, (non-zero), or boolean true/false
  'boolean': {
    fromData: function(serialized) {
      var type = typeof serialized;

      if (type === "boolean") {
        return serialized;
      } else if (type === "string") {
        return serialized.match(/^true$|^t$|^1$/i) !== null;
      } else if (type === "number") {
        return serialized === 1;
      } else {
        return false;
      }
    },

    toData: function(deserialized) {
      return Boolean(deserialized);
    }
  },

  date: {
    fromData: function(serialized) {
      var type = typeof serialized;

      if (type === "string" || type === "number") {
        // this is a fix for Safari 5.1.5 on Mac which does not accept timestamps as yyyy-mm-dd
        if (type === "string" && serialized.search(/^\d{4}-\d{2}-\d{2}$/) !== -1){
          serialized += "T00:00:00Z";
        }

        return new Date(serialized);
      } else if (serialized === null || serialized === undefined) {
        // if the value is not present in the data,
        // return undefined, not null.
        return serialized;
      } else {
        return null;
      }
    },

    toData: function(date) {
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
      } else if (date === undefined) {
        return undefined;
      } else {
        return null;
      }
    }
  }
});
