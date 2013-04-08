/*global __fail__*/

/**
Ember Data Store Debug

@module ember-data
*/

/**
@class DS
*/

if ('undefined' === typeof DS) {
    DS = Ember.Namespace.create({
      // this one goes past 11
      CURRENT_API_REVISION: 12
    });
}

if ('undefined' !== typeof window) {
    window.DS = DS;
}
