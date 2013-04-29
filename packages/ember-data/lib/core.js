/**
  @module data
  @main data
*/

/**
  All Ember Data methods and functions are defined inside of this namespace. 

  @class DS
  @static
*/

window.DS = Ember.Namespace.create({
  /**
    Current API revision. See 
    [BREAKING_CHANGES.md](https://github.com/emberjs/data/blob/master/BREAKING_CHANGES.md) 
    for more information.

    @property CURRENT_API_REVISION
    @type Integer
  */
  CURRENT_API_REVISION: 12
});
