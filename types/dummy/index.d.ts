/**
 * Any types defined here are only for the purposes of building and testing
 * ember-data. They will not be shipped to consumers. Ember-data still relies
 * on some private Ember APIs -- those should be defined here as we encounter them.
 */
declare module '@ember/debug' {
  export function assert(msg: string, test: any): boolean;
}
