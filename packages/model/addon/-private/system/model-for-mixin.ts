import { getOwner } from '@ember/application';

import Model from '../model';

type Store = import('@ember-data/store').default;

/*
    In case someone defined a relationship to a mixin, for example:
    ```
      let Comment = Model.extend({
        owner: belongsTo('commentable'. { polymorphic: true })
      });
      let Commentable = Ember.Mixin.create({
        comments: hasMany('comment')
      });
    ```
    we want to look up a Commentable class which has all the necessary
    relationship metadata. Thus, we look up the mixin and create a mock
    Model, so we can access the relationship CPs of the mixin (`comments`)
    in this case
  */
export default function modelForMixin(store: Store, normalizedModelName: string): Model | null {
  let owner = getOwner(store);
  let MaybeMixin = owner.factoryFor(`mixin:${normalizedModelName}`);
  let mixin = MaybeMixin && MaybeMixin.class;
  if (mixin) {
    let ModelForMixin = Model.extend(mixin);
    ModelForMixin.reopenClass({
      __isMixin: true,
      __mixin: mixin,
    });
    //Cache the class as a model
    owner.register('model:' + normalizedModelName, ModelForMixin);
  }
  return owner.factoryFor(`model:${normalizedModelName}`);
}
