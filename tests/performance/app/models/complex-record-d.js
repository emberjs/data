import Model, { attr, hasMany } from '@ember-data/model';

import recordMixinA from '../mixins/record-mixin-a';
import recordMixinB from '../mixins/record-mixin-b';
import recordMixinC from '../mixins/record-mixin-c';
import recordMixinD from '../mixins/record-mixin-d';
import recordMixinE from '../mixins/record-mixin-e';
import recordMixinF from '../mixins/record-mixin-f';
import recordMixinG from '../mixins/record-mixin-g';
import recordMixinH from '../mixins/record-mixin-h';
import recordMixinI from '../mixins/record-mixin-i';
import recordMixinJ from '../mixins/record-mixin-j';

export default class ComplexRecordD extends Model.extend(
  recordMixinD,
  recordMixinE,
  recordMixinF,
  recordMixinG,
  recordMixinH,
  recordMixinI,
  recordMixinJ,
  recordMixinA,
  recordMixinB,
  recordMixinC
) {
  @attr prop_resource_d_1;
  @attr prop_resource_d_2;
  @attr prop_resource_d_3;
  @attr prop_resource_d_4;
  @attr prop_resource_d_5;
  @attr prop_resource_d_6;
  @attr prop_resource_d_7;
  @attr prop_resource_d_8;
  @attr prop_resource_d_9;
  @attr prop_resource_d_10;

  @hasMany('complex-record-c', { async: false, inverse: null })
  hasMany_resource_d_c;
}
