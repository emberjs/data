import Model from '../model';
import { getOwner } from '@ember/application';

export function modelForMixin(normalizedModelName: string): Model {
  let owner = getOwner(this);
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
