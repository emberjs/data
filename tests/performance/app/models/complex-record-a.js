import Model, { attr, belongsTo } from '@ember-data/model';

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

export default class ComplexRecordA extends Model.extend(
  recordMixinA,
  recordMixinB,
  recordMixinC,
  recordMixinD,
  recordMixinE,
  recordMixinF,
  recordMixinG,
  recordMixinH,
  recordMixinI,
  recordMixinJ
) {
  @attr prop_resource_a_1;
  @attr prop_resource_a_2;
  @attr prop_resource_a_3;
  @attr prop_resource_a_4;
  @attr prop_resource_a_5;
  @attr prop_resource_a_6;
  @attr prop_resource_a_7;
  @attr prop_resource_a_8;
  @attr prop_resource_a_9;
  @attr prop_resource_a_10;

  @belongsTo('complex-record-b', { async: false, inverse: 'belongsTo_resource_b_a' })
  belongsTo_resource_a_b;
  @belongsTo('complex-record-c', { async: false, inverse: 'hasMany_resource_c_a' })
  belongsTo_resource_a_c;
  @belongsTo('complex-record-d', { async: false, inverse: null })
  belongsTo_resource_a_d;
}
