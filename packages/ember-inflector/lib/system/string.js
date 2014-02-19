import Inflector from "./inflector";
var pluralize = function(word) {
  return Inflector.inflector.pluralize(word);
};

var singularize = function(word) {
  return Inflector.inflector.singularize(word);
};

export {pluralize, singularize};
