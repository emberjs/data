import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

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

export default class ComplexRecordB extends Model.extend(
  recordMixinB,
  recordMixinC,
  recordMixinD,
  recordMixinE,
  recordMixinF,
  recordMixinG,
  recordMixinH,
  recordMixinI,
  recordMixinJ,
  recordMixinA
) {
  @attr prop_resource_b_1;
  @attr prop_resource_b_2;
  @attr prop_resource_b_3;
  @attr prop_resource_b_4;
  @attr prop_resource_b_5;
  @attr prop_resource_b_6;
  @attr prop_resource_b_7;
  @attr prop_resource_b_8;
  @attr prop_resource_b_9;
  @attr prop_resource_b_10;

  @belongsTo('complex-record-a', { async: false, inverse: 'belongsTo_resource_a_b' })
  belongsTo_resource_b_a;
  @hasMany('complex-record-c', { async: false, inverse: 'hasMany_resource_c_b' })
  hasMany_resource_b_c;
  @hasMany('complex-record-d', { async: false, inverse: null })
  hasMany_resource_b_d;
}
