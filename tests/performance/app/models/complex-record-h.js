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

export default class ComplexRecordH extends Model.extend(
  recordMixinH,
  recordMixinI,
  recordMixinJ,
  recordMixinA,
  recordMixinB,
  recordMixinC,
  recordMixinD,
  recordMixinE,
  recordMixinF,
  recordMixinG
) {
  @attr prop_resource_h_1;
  @attr prop_resource_h_2;
  @attr prop_resource_h_3;
  @attr prop_resource_h_4;
  @attr prop_resource_h_5;
  @attr prop_resource_h_6;
  @attr prop_resource_h_7;
  @attr prop_resource_h_8;
  @attr prop_resource_h_9;
  @attr prop_resource_h_10;
}
