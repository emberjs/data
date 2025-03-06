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

import Model, { attr, hasMany } from '@ember-data/model';

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
