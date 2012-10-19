/*global QUnit*/

(function() {
    // Tests should time out after 5 seconds
    QUnit.config.testTimeout = 5000;

    // Handle JSHint
    QUnit.config.urlConfig.push('nojshint');

    var noJsHint = location.search.match(/nojshint=([^&]+)/);
    window.jsHint = !(noJsHint && decodeURIComponent(noJsHint[1]));

    window.jsHintReporter = function (file, errors) {
      if (!errors) { return ''; }

      var len = errors.length,
          str = '',
          error, idx;

      if (len === 0) { return ''; }

      for (idx=0; idx<len; idx++) {
        error = errors[idx];
        str += file  + ': line ' + error.line + ', col ' +
            error.character + ', ' + error.reason + '\n';
      }

      return str + "\n" + len + ' error' + ((len === 1) ? '' : 's');
    };

    // Handle extending prototypes
    QUnit.config.urlConfig.push('extendprototypes');

    window.Ember = window.Ember || {};

    var extendPrototypes = location.search.match(/extendprototypes=([^&]+)/);

    Ember.EXTEND_PROTOTYPES = !!(extendPrototypes && decodeURIComponent(extendPrototypes[1]));

    // hack qunit to not suck for Ember objects
    var originalTypeof = QUnit.jsDump.typeOf;

    QUnit.jsDump.typeOf = function(obj) {
      if (Ember && Ember.Object && Ember.Object.detectInstance(obj)) {
        return "emberObject";
      }

      return originalTypeof.call(this, obj);
    };

    QUnit.jsDump.parsers.emberObject = function(obj) {
      return obj.toString();
    };
})();
