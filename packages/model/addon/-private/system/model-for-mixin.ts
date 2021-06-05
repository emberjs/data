import { getOwner } from '@ember/application';

import Model from '../model';

type DSModelSchema = import('@ember-data/store/-private/ts-interfaces/ds-model').DSModelSchema;
type Dict<T> = import('@ember-data/store/-private/ts-interfaces/utils').Dict<T>;
type Mixin<T> = import('@ember/object/mixin').default<T>;
type Store = import('@ember-data/store/-private/system/core-store').default;
/* 
    In case someone defined a relationship to a mixin, for example:
    ```
      import Model, { belongsTo, hasMany } from '@ember-data/model';
      import Mixin from '@ember/object/mixin';

      class CommentModel extends Model {
        @belongsTo('commentable', { polymorphic: true }) owner;
      }

      let Commentable = Mixin.create({
        @hasMany('comment') comments;
      });
    ```
    we want to look up a Commentable class which has all the necessary
    relationship meta data. Thus, we look up the mixin and create a mock
    Model, so we can access the relationship CPs of the mixin (`comments`)
    in this case
  */
const BaseModel: DSModelSchema = Model as unknown as DSModelSchema;
export default function modelForMixin(store: Store, normalizedModelName: string): DSModelSchema | null {
  let owner = getOwner(store);
  let MaybeMixin = owner.factoryFor(`mixin:${normalizedModelName}`);
  let mixin: Mixin<Dict<unknown>> = MaybeMixin && MaybeMixin.class;
  if (mixin) {
    let ModelForMixin: DSModelSchema = BaseModel.extend(mixin);
    ModelForMixin.reopenClass({
      __isMixin: true,
      __mixin: mixin,
    });
    //Cache the class as a model
    owner.register('model:' + normalizedModelName, ModelForMixin);
  }
  return owner.factoryFor(`model:${normalizedModelName}`);
}
