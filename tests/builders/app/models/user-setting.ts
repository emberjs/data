import Model, { attr } from '@ember-data/model';

export default class UserSetting extends Model {
  @attr declare name: string;
}
