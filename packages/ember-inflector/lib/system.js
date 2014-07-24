import Inflector from "./system/inflector";
import {
  pluralize,
  singularize
} from "./system/string";
import defaultRules from "./system/inflections";

Inflector.inflector = new Inflector(defaultRules);

export {
  Inflector,
  singularize,
  pluralize,
  defaultRules
};
