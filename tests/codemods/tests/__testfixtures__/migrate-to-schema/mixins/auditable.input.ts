import Mixin from '@ember/object/mixin';
import { attr, belongsTo } from '@ember-data/model';

export default Mixin.create({
  @attr('date') createdAt,
  @attr('date') updatedAt,
  @belongsTo('user', { async: false, inverse: null }) createdBy,
  @belongsTo('user', { async: false, inverse: null }) updatedBy,

  get wasRecentlyUpdated() {
    if (!this.updatedAt) return false;
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    return this.updatedAt > oneHourAgo;
  }
});