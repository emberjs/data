var none = Ember.isNone;

/**
  DS.Transforms is a hash of transforms used by DS.Serializer.
*/
DS.JSONTransforms = {
  string: {
    deserialize: function(serialized) {
      return none(serialized) ? null : String(serialized);
    },

    serialize: function(deserialized) {
      return none(deserialized) ? null : String(deserialized);
    }
  },

  number: {
    deserialize: function(serialized) {
      return none(serialized) ? null : Number(serialized);
    },

    serialize: function(deserialized) {
      return none(deserialized) ? null : Number(deserialized);
    }
  },

  // Handles the following boolean inputs:
  // "TrUe", "t", "f", "FALSE", 0, (non-zero), or boolean true/false
  'boolean': {
    deserialize: function(serialized) {
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

    serialize: function(deserialized) {
      return Boolean(deserialized);
    }
  },

  date: {
    deserialize: function(serialized) {
      var type = typeof serialized;
      var date = null;

      if (type === "string" || type === "number") {
        // this is a fix for Safari 5.1.5 on Mac which does not accept timestamps as yyyy-mm-dd
        if (type === "string" && serialized.search(/^\d{4}-\d{2}-\d{2}$/) !== -1) {
          serialized += "T00:00:00Z";
        }

        date = new Date(serialized);

        // this is a fix for IE8 which does not accept timestamps in ISO 8601 format
        if (type === "string" && isNaN(date)) {
          date = new Date(Date.parse(serialized.replace(/\-/ig, '/').replace(/Z$/, '').split('.')[0]));
        }

        return date;
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
  }
};
