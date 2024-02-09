import EmberArrayProtoExtensions from '@ember/array/types/prototype-extensions';

declare module 'ember' {
  export function run(callback: Function);
  export function meta(obj: Object): {
    addMixin(mixin: Object): boolean;
  };
  interface ArrayPrototypeExtensions<T> extends EmberArrayProtoExtensions<T> {}
}
