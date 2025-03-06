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

export default class ComplexRecordI extends Model.extend(
  recordMixinI,
  recordMixinJ,
  recordMixinA,
  recordMixinB,
  recordMixinC,
  recordMixinD,
  recordMixinE,
  recordMixinF,
  recordMixinG,
  recordMixinH
) {
  @attr prop_resource_i_1;
  @attr prop_resource_i_2;
  @attr prop_resource_i_3;
  @attr prop_resource_i_4;
  @attr prop_resource_i_5;
  @attr prop_resource_i_6;
  @attr prop_resource_i_7;
  @attr prop_resource_i_8;
  @attr prop_resource_i_9;
  @attr prop_resource_i_10;
}
