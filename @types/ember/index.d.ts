import EmberArrayProtoExtensions from '@ember/array/types/prototype-extensions';

declare module 'ember' {
  export function run(callback: Function);
  export const ENV: {
    DS_WARN_ON_UNKNOWN_KEYS?: boolean;
  };
  export function meta(obj: Object): {
    hasMixin(mixin: Object): boolean;
  };
  interface ArrayPrototypeExtensions<T> extends EmberArrayProtoExtensions<T> {}
}
