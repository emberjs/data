import Model, { attr, belongsTo } from '@ember-data/model';
import AuditableMixin from '../mixins/auditable';

export default class Post extends Model.extend(AuditableMixin) {
  @attr('string') title;
  @attr('string') content;
  @attr('boolean', { defaultValue: false }) published;
  @belongsTo('user', { async: false }) author;

  get excerpt() {
    return this.content?.slice(0, 100) + '...';
  }
}