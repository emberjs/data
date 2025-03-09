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

export default class ComplexRecordE extends Model.extend(
  recordMixinE,
  recordMixinF,
  recordMixinG,
  recordMixinH,
  recordMixinI,
  recordMixinJ,
  recordMixinA,
  recordMixinB,
  recordMixinC,
  recordMixinD
) {
  @attr prop_resource_e_1;
  @attr prop_resource_e_2;
  @attr prop_resource_e_3;
  @attr prop_resource_e_4;
  @attr prop_resource_e_5;
  @attr prop_resource_e_6;
  @attr prop_resource_e_7;
  @attr prop_resource_e_8;
  @attr prop_resource_e_9;
  @attr prop_resource_e_10;
}
