var BLANK_REGEX = /^\s*$/;

function loadUncountable(rules, uncountable) {
  for (var i = 0, length = uncountable.length; i < length; i++) {
    rules.uncountable[uncountable[i].toLowerCase()] = true;
  }
}

function loadIrregular(rules, irregularPairs) {
  var pair;

  for (var i = 0, length = irregularPairs.length; i < length; i++) {
    pair = irregularPairs[i];

    //pluralizing
    rules.irregular[pair[0].toLowerCase()] = pair[1];
    rules.irregular[pair[1].toLowerCase()] = pair[1];

    //singularizing
    rules.irregularInverse[pair[1].toLowerCase()] = pair[0];
    rules.irregularInverse[pair[0].toLowerCase()] = pair[0];
  }
}

/**
  Inflector.Ember provides a mechanism for supplying inflection rules for your
  application. Ember includes a default set of inflection rules, and provides an
  API for providing additional rules.

  Examples:

  Creating an inflector with no rules.

  ```js
  var inflector = new Ember.Inflector();
  ```

  Creating an inflector with the default ember ruleset.

  ```js
  var inflector = new Ember.Inflector(Ember.Inflector.defaultRules);

  inflector.pluralize('cow'); //=> 'kine'
  inflector.singularize('kine'); //=> 'cow'
  ```

  Creating an inflector and adding rules later.

  ```javascript
  var inflector = Ember.Inflector.inflector;

  inflector.pluralize('advice'); // => 'advices'
  inflector.uncountable('advice');
  inflector.pluralize('advice'); // => 'advice'

  inflector.pluralize('formula'); // => 'formulas'
  inflector.irregular('formula', 'formulae');
  inflector.pluralize('formula'); // => 'formulae'

  // you would not need to add these as they are the default rules
  inflector.plural(/$/, 's');
  inflector.singular(/s$/i, '');
  ```

  Creating an inflector with a nondefault ruleset.

  ```javascript
  var rules = {
    plurals:  [ /$/, 's' ],
    singular: [ /\s$/, '' ],
    irregularPairs: [
      [ 'cow', 'kine' ]
    ],
    uncountable: [ 'fish' ]
  };

  var inflector = new Ember.Inflector(rules);
  ```

  @class Inflector
  @namespace Ember
*/
function Inflector(ruleSet) {
  ruleSet = ruleSet || {};
  ruleSet.uncountable = ruleSet.uncountable || makeDictionary();
  ruleSet.irregularPairs = ruleSet.irregularPairs || makeDictionary();

  var rules = this.rules = {
    plurals:  ruleSet.plurals || [],
    singular: ruleSet.singular || [],
    irregular: makeDictionary(),
    irregularInverse: makeDictionary(),
    uncountable: makeDictionary()
  };

  loadUncountable(rules, ruleSet.uncountable);
  loadIrregular(rules, ruleSet.irregularPairs);

  this.enableCache();
}

if (!Object.create && !Object.create(null).hasOwnProperty) {
  throw new Error("This browser does not support Object.create(null), please polyfil with es5-sham: http://git.io/yBU2rg");
}

function makeDictionary() {
  var cache = Object.create(null);
  cache['_dict'] = null;
  delete cache['_dict'];
  return cache;
}

Inflector.prototype = {
  /**
    @public

    As inflections can be costly, and commonly the same subset of words are repeatedly
    inflected an optional cache is provided.

    @method enableCache
  */
  enableCache: function() {
    this.purgeCache();

    this.singularize = function(word) {
      this._cacheUsed = true;
      return this._sCache[word] || (this._sCache[word] = this._singularize(word));
    };

    this.pluralize = function(word) {
      this._cacheUsed = true;
      return this._pCache[word] || (this._pCache[word] = this._pluralize(word));
    };
  },

  /**
    @public

    @method purgedCache
  */
  purgeCache: function() {
    this._cacheUsed = false;
    this._sCache = makeDictionary();
    this._pCache = makeDictionary();
  },

  /**
    @public
    disable caching

    @method disableCache;
  */
  disableCache: function() {
    this._sCache = null;
    this._pCache = null;
    this.singularize = function(word) {
      return this._singularize(word);
    };

    this.pluralize = function(word) {
      return this._pluralize(word);
    };
  },

  /**
    @method plural
    @param {RegExp} regex
    @param {String} string
  */
  plural: function(regex, string) {
    if (this._cacheUsed) { this.purgeCache(); }
    this.rules.plurals.push([regex, string.toLowerCase()]);
  },

  /**
    @method singular
    @param {RegExp} regex
    @param {String} string
  */
  singular: function(regex, string) {
    if (this._cacheUsed) { this.purgeCache(); }
    this.rules.singular.push([regex, string.toLowerCase()]);
  },

  /**
    @method uncountable
    @param {String} regex
  */
  uncountable: function(string) {
    if (this._cacheUsed) { this.purgeCache(); }
    loadUncountable(this.rules, [string.toLowerCase()]);
  },

  /**
    @method irregular
    @param {String} singular
    @param {String} plural
  */
  irregular: function (singular, plural) {
    if (this._cacheUsed) { this.purgeCache(); }
    loadIrregular(this.rules, [[singular, plural]]);
  },

  /**
    @method pluralize
    @param {String} word
  */
  pluralize: function(word) {
    return this._pluralize(word);
  },

  _pluralize: function(word) {
    return this.inflect(word, this.rules.plurals, this.rules.irregular);
  },
  /**
    @method singularize
    @param {String} word
  */
  singularize: function(word) {
    return this._singularize(word);
  },

  _singularize: function(word) {
    return this.inflect(word, this.rules.singular,  this.rules.irregularInverse);
  },

  /**
    @protected

    @method inflect
    @param {String} word
    @param {Object} typeRules
    @param {Object} irregular
  */
  inflect: function(word, typeRules, irregular) {
    var inflection, substitution, result, lowercase, isBlank,
    isUncountable, isIrregular, isIrregularInverse, rule;

    isBlank = BLANK_REGEX.test(word);

    if (isBlank) {
      return word;
    }

    lowercase = word.toLowerCase();

    isUncountable = this.rules.uncountable[lowercase];

    if (isUncountable) {
      return word;
    }

    isIrregular = irregular && irregular[lowercase];

    if (isIrregular) {
      return isIrregular;
    }

    for (var i = typeRules.length, min = 0; i > min; i--) {
       inflection = typeRules[i-1];
       rule = inflection[0];

      if (rule.test(word)) {
        break;
      }
    }

    inflection = inflection || [];

    rule = inflection[0];
    substitution = inflection[1];

    result = word.replace(rule, substitution);

    return result;
  }
};

export default Inflector;
