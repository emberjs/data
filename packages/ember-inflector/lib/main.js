import {Inflector, inflections, pluralize, singularize} from "./system";

Inflector.defaultRules = inflections;
Ember.Inflector        = Inflector;

Ember.String.pluralize   = pluralize;
Ember.String.singularize = singularize;

import "./ext/string";

export default Inflector;

export {pluralize, singularize};
