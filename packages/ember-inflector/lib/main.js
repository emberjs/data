import {
  Inflector,
  defaultRules,
  pluralize,
  singularize
} from "./system";

Inflector.defaultRules = defaultRules;
Ember.Inflector        = Inflector;

Ember.String.pluralize   = pluralize;
Ember.String.singularize = singularize;

import "./ext/string";

export default Inflector;

export {
  pluralize,
  singularize
};
