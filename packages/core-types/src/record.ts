/*
 * @module @warp-drive/core-types
 */
import type { ResourceType } from './symbols';

/**
 * Records may be anything, They don't even
 * have to be objects.
 *
 * Whatever they are, if they have a ResourceType
 * property, that property will be used by EmberData
 * and WarpDrive to provide better type safety and
 * intellisense.
 *
 * @class TypedRecordInstance
 * @typedoc
 */
export interface TypedRecordInstance {
  /**
   * The type of the resource.
   *
   * This is an optional feature that can be used by
   * record implementations to provide a typescript
   * hint for the type of the resource.
   *
   * When used, EmberData and WarpDrive APIs can
   * take advantage of this to provide better type
   * safety and intellisense.
   *
   * @property {ResourceType} [ResourceType]
   * @type {string}
   * @typedoc
   */
  [ResourceType]: string;
}

/**
 * A type utility that extracts the ResourceType if available,
 * otherwise it returns never.
 *
 * @typedoc
 */
export type TypeFromInstance<T> = T extends TypedRecordInstance ? T[typeof ResourceType] : never;

/**
 * A type utility that extracts the ResourceType if available,
 * otherwise it returns string
 *
 * @typedoc
 */
export type TypeFromInstanceOrString<T> = T extends TypedRecordInstance ? T[typeof ResourceType] : string;

type Unpacked<T> = T extends (infer U)[] ? U : T;
type NONE = { __NONE: never };
type ExpandIgnore<T extends TypedRecordInstance, Ignore = NONE, I extends keyof T & string = keyof T & string> = {
  [K in I]: Unpacked<Awaited<T[K]>> extends T
    ? K
    : Unpacked<Awaited<T[K]>> extends Ignore
      ? never
      : Unpacked<Awaited<T[K]>> extends TypedRecordInstance
        ? ExpandIgnore<Unpacked<Awaited<T[K]>>, Ignore | T>
        : never;
};
type ToPaths<T, Pre = NONE> = Exclude<
  | {
      [K in keyof T]: T[K] extends string
        ? Pre extends string
          ? `${Pre}.${T[K]}`
          : T[K]
        : T[K] extends never
          ? never
          : K extends string
            ? ToPaths<T[K], Pre extends string ? `${Pre}.${K}` : K>
            : never;
    }[keyof T]
  | Pre,
  NONE
>;
export type Includes<T extends TypedRecordInstance> = ToPaths<ExpandIgnore<T>>;

// test

type MyThing = {
  name: string;
  relatedThing: MyThing;
  relatedThings: MyThing[];
  otherThing: OtherThing;
  otherThings: OtherThing[];
  [ResourceType]: 'thing';
};

type OtherThing = {
  name: string;
  thirdThing: OtherThing;
  deals: OtherThing[];
  original: MyThing;
  deep: DeepThing;
  [ResourceType]: 'other-thing';
};

type DeepThing = {
  name: string;
  relatedThing: MyThing;
  otherThing: OtherThing;
  myThing: DeepThing;
  [ResourceType]: 'deep-thing';
};

function takesIncludes<T extends TypedRecordInstance>(includes: Includes<T>[]) {}
takesIncludes<MyThing>([
  // @ts-expect-error not a valid path
  'not', // doesn't exist
  'relatedThing',
  'relatedThings',
  'otherThing',
  'otherThings',
  // @ts-expect-error not a valid path
  'name' /* never*/,
  'otherThing.thirdThing',
  'otherThing.deep',
  'otherThing.deep.myThing',
]);
