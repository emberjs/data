import {
  pluralize,
  singularize
} from "../system/string";

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.String) {
  /**
    See {{#crossLink "Ember.String/pluralize"}}{{/crossLink}}

    @method pluralize
    @for String
  */
  String.prototype.pluralize = function() {
    return pluralize(this);
  };

  /**
    See {{#crossLink "Ember.String/singularize"}}{{/crossLink}}

    @method singularize
    @for String
  */
  String.prototype.singularize = function() {
    return singularize(this);
  };
}
