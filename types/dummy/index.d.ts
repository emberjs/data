/**
 * Any types defined here are only for the purposes of building and testing
 * ember-data. They will not be shipped to consumers. Ember-data still relies
 * on some private Ember APIs -- those should be defined here as we encounter them.
 */

declare module '@ember/array' {
  export function detect(obj: any): boolean;
}

declare module '@ember/ordered-set' {
  export default class OrderedSet {
    presenceSet: { [guid: string]: boolean };
    list: any[];
    size: number;
  }
}

declare type Nullable<T> = T | null;

declare interface Link {
  href: string;
}
