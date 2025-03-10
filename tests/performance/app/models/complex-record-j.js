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

export default class ComplexRecordJ extends Model.extend(
  recordMixinJ,
  recordMixinA,
  recordMixinB,
  recordMixinC,
  recordMixinD,
  recordMixinE,
  recordMixinF,
  recordMixinG,
  recordMixinH,
  recordMixinI
) {
  @attr prop_resource_j_1;
  @attr prop_resource_j_2;
  @attr prop_resource_j_3;
  @attr prop_resource_j_4;
  @attr prop_resource_j_5;
  @attr prop_resource_j_6;
  @attr prop_resource_j_7;
  @attr prop_resource_j_8;
  @attr prop_resource_j_9;
  @attr prop_resource_j_10;
}
