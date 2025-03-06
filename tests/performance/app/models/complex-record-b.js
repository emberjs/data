import recordMixinA from 'app/mixins/record-mixin-a';
import recordMixinB from 'app/mixins/record-mixin-b';
import recordMixinC from 'app/mixins/record-mixin-c';
import recordMixinD from 'app/mixins/record-mixin-d';
import recordMixinE from 'app/mixins/record-mixin-e';
import recordMixinF from 'app/mixins/record-mixin-f';
import recordMixinG from 'app/mixins/record-mixin-g';
import recordMixinH from 'app/mixins/record-mixin-h';
import recordMixinI from 'app/mixins/record-mixin-i';
import recordMixinJ from 'app/mixins/record-mixin-j';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

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
