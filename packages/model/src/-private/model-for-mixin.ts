import { getOwner } from '@ember/application';

import type Store from '@ember-data/store';

import Model, { type ModelFactory } from './model';

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
export default function modelForMixin(store: Store, normalizedModelName: string): ModelFactory | undefined {
  let owner: any = getOwner(store);
  let MaybeMixin = owner.factoryFor(`mixin:${normalizedModelName}`);
  let mixin = MaybeMixin && MaybeMixin.class;
  if (mixin) {
    let ModelForMixin = Model.extend(mixin);
    ModelForMixin.__isMixin = true;
    ModelForMixin.__mixin = mixin;
    //Cache the class as a model
    owner.register('model:' + normalizedModelName, ModelForMixin);
  }
  return owner.factoryFor(`model:${normalizedModelName}`);
}
