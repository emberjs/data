// tslint:disable:max-classes-per-file
declare module "ember-data/types" {
  /**
   * A mapping type for resolving model names into model types.
   * For now, users need to explicitly define this type in their project,
   * and their interface will be merged with this one.
   *
   * Example:
   *
   *  declare module 'ember-data/types' {
   *    import { BlogPost } from 'my-app/models/blog-post';
   *    import { User } from 'my-app/models/user';
   *
   *    interface RecordTypeMap {
   *      user: User;
   *      'blog-post': BlogPost;
   *    }
   *    interface TransformsMap {
   *      csv: string[];
   *    }
   *  }
   */
  /* tslint:disable-next-line no-empty-interface */
  interface RecordTypeMap {}
  /**
   * A mapping type for resolving attribute type names to attribute types.
   * This is set up for attribute types supported by ember-data by default,
   * but if users wish to define their own transforms, and have them work
   * with TypeScript, they may merge additional properties into this interface
   *
   * Example:
   *
   *  declare module 'ember-data/types' {
   *    interface TransformsMap {
   *      csv: string[];
   *    }
   *  }
   */
  interface TransformsMap {
    string: string;
    number: number;
    boolean: boolean;
    date: Date;
  }
}

declare module "ember-data" {
  import ArrayProxy from "@ember/array/proxy";
  import EmberObject from "@ember/object";
  import ComputedProperty from "@ember/object/computed";
  import { RecordTypeMap, TransformsMap } from "ember-data/types";
  import { Promise } from "rsvp";

  namespace DS {
    /// MODEL
    class Model extends EmberObject {
      public id: string | number;
    }

    /// STORE
    class Store extends EmberObject {
      public query<S extends keyof RecordTypeMap>(
        modelName: S,
        queryParams: any
      ): Promise<ArrayProxy<RecordTypeMap[S]>>;

      public createRecord<S extends keyof RecordTypeMap>(
        modelName: S,
        params?: Partial<RecordTypeMap[S]>
      ): RecordTypeMap[S];
      public findRecord<S extends keyof RecordTypeMap>(
        modelName: S,
        id: string | number
      ): Promise<RecordTypeMap[S]>;
      public findAll<S extends keyof RecordTypeMap>(
        modelName: S
      ): Promise<ArrayProxy<RecordTypeMap[S]>>;
    }
    /// ATTR
    interface AttrOptions<T> {
      defaultValue?: T | (() => T);
    }

    function attr<S extends keyof TransformsMap>(
      type: S,
      options?: AttrOptions<TransformsMap[S]>
    ): ComputedProperty<TransformsMap[S]>;

    /// RELATIONSHIPS
    interface RelationshipOptions<To> {
      inverse?: keyof To;
    }

    export function hasMany<S extends keyof RecordTypeMap>(
      modelName: S,
      relationshipOptions?: RelationshipOptions<RecordTypeMap[S]>
    ): ComputedProperty<ArrayProxy<RecordTypeMap[S]>>;
    export function belongsTo<S extends keyof RecordTypeMap>(
      modelName: S,
      relationshipOptions?: RelationshipOptions<RecordTypeMap[S]>
    ): ComputedProperty<RecordTypeMap[S]>;
  }
  export default DS;
}

/**
 * Inject the `store` service onto Route and Controller types
 */
declare module "ember" {
  import Store from "ember-data/store";
  namespace Ember {
    interface Route {
      store: ComputedProperty<Store>;
    }
    interface Controller {
      store: ComputedProperty<Store>;
    }
  }
}

declare module "ember-data/model" {
  import DS from "ember-data";
  export default DS.Model;
}

declare module "ember-data/store" {
  import DS from "ember-data";
  export default DS.Store;
}

declare module "ember-data/attr" {
  import DS from "ember-data";
  export default DS.attr;
}

declare module "ember-data/relationships" {
  import DS from "ember-data";
  export const hasMany: typeof DS.hasMany;
  export const belongsTo: typeof DS.belongsTo;
}
