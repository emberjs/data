import Model, { attr } from '@ember-data/model';

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

export default class ComplexRecordG extends Model.extend(
  recordMixinG,
  recordMixinH,
  recordMixinI,
  recordMixinJ,
  recordMixinA,
  recordMixinB,
  recordMixinC,
  recordMixinD,
  recordMixinE,
  recordMixinF
) {
  @attr prop_resource_g_1;
  @attr prop_resource_g_2;
  @attr prop_resource_g_3;
  @attr prop_resource_g_4;
  @attr prop_resource_g_5;
  @attr prop_resource_g_6;
  @attr prop_resource_g_7;
  @attr prop_resource_g_8;
  @attr prop_resource_g_9;
  @attr prop_resource_g_10;
}
