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

import Model, { attr } from '@ember-data/model';

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
