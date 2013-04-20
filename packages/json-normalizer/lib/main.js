define("json-normalizer/hash-utils",
  ["json-normalizer/string-utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var camelize = __dependency1__.camelize;
    var decamelize = __dependency1__.decamelize;

    function map(object, callback, binding) {
      var ret = {};

      for (var prop in object) {
        callback.call(binding, ret, prop, object[prop]);
      }

      return ret;
    }


    var __export1__ = function camelizeKeys(object) {
      return map(object, function(hash, key, value) {
        hash[camelize(key)] = value;
      });
    }

    var __export2__ = function decamelizeKeys(object) {
      return map(object, function(hash, key, value) {
        hash[decamelize(key)] = value;
      });
    }
    __exports__.map = map;
    __exports__.camelizeKeys = __export1__;
    __exports__.decamelizeKeys = __export2__;
  });

define("json-normalizer/processor",
  ["json-normalizer/hash-utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var camelizeKeys = __dependency1__.camelizeKeys;

    function Processor(json) {
    	this.json = json;
    }

    Processor.prototype = {
      constructor: Processor,

      camelizeKeys: function() {
        this.json = camelizeKeys(this.json);
        return this;
      }
    }

    __exports__.Processor = Processor;
  });

define("json-normalizer/string-utils",
  ["exports"],
  function(__exports__) {
    "use strict";
    var STRING_CAMELIZE_REGEXP = (/(\-|_|\.|\s)+(.)?/g);

    var __export1__ = function camelize(str) {
      return str.replace(STRING_CAMELIZE_REGEXP, function(match, separator, chr) {
        return chr ? chr.toUpperCase() : '';
      }).replace(/^([A-Z])/, function(match, separator, chr) {
        return match.toLowerCase();
      });
    }

    var STRING_DECAMELIZE_REGEXP = (/([a-z])([A-Z])/g);

    var __export2__ = function decamelize(str) {
      return str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase();
    }
    __exports__.camelize = __export1__;
    __exports__.decamelize = __export2__;
  });

define("json-normalizer",
  ["json-normalizer/string-utils","json-normalizer/hash-utils","json-normalizer/processor","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var camelize = __dependency1__.camelize;
    var decamelize = __dependency1__.decamelize;
    var map = __dependency2__.map;
    var camelizeKeys = __dependency2__.camelizeKeys;
    var decamelizeKeys = __dependency2__.decamelizeKeys;
    var Processor = __dependency3__.Processor;

    var mapKeys = map;


    __exports__.camelize = camelize;
    __exports__.decamelize = decamelize;
    __exports__.mapKeys = mapKeys;
    __exports__.camelizeKeys = camelizeKeys;
    __exports__.decamelizeKeys = decamelizeKeys;
    __exports__.Processor = Processor;
  });
