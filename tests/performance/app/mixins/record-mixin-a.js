// eslint-disable-next-line no-restricted-imports
import Mixin from '@ember/object/mixin';

import { attr, belongsTo } from '@ember-data/model';

export default Mixin.create({
  prop_trait_a_1: attr(),
  prop_trait_a_2: attr(),
  prop_trait_a_3: attr(),
  prop_trait_a_4: attr(),
  prop_trait_a_5: attr(),
  prop_trait_a_6: attr(),
  prop_trait_a_7: attr(),
  prop_trait_a_8: attr(),
  prop_trait_a_9: attr(),
  prop_trait_a_10: attr(),

  belongsTo_trait_a_b: belongsTo('record-mixin-b', {
    async: false,
    inverse: 'belongsTo_trait_b_a',
    polymorphic: true,
    as: 'record-mixin-a',
  }),
  belongsTo_trait_a_c: belongsTo('record-mixin-c', {
    async: false,
    inverse: 'belongsTo_trait_c_a',
    polymorphic: true,
    as: 'record-mixin-a',
  }),
  belongsTo_trait_a_d: belongsTo('record-mixin-d', {
    async: false,
    inverse: null,
    polymorphic: true,
  }),
});
