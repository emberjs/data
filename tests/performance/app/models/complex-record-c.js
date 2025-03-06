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

export default class ComplexRecordC extends Model.extend(
  recordMixinC,
  recordMixinD,
  recordMixinE,
  recordMixinF,
  recordMixinG,
  recordMixinH,
  recordMixinI,
  recordMixinJ,
  recordMixinA,
  recordMixinB
) {
  @attr prop_resource_c_1;
  @attr prop_resource_c_2;
  @attr prop_resource_c_3;
  @attr prop_resource_c_4;
  @attr prop_resource_c_5;
  @attr prop_resource_c_6;
  @attr prop_resource_c_7;
  @attr prop_resource_c_8;
  @attr prop_resource_c_9;
  @attr prop_resource_c_10;

  @hasMany('complex-record-a', { async: false, inverse: 'belongsTo_resource_a_c' })
  hasMany_resource_c_a;
  @hasMany('complex-record-b', { async: false, inverse: 'hasMany_resource_b_c' })
  hasMany_resource_c_b;
  @hasMany('complex-record-d', { async: false, inverse: null })
  hasMany_resource_c_d;
}
