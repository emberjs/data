// eslint-disable-next-line no-restricted-imports
import Mixin from '@ember/object/mixin';

import { attr, belongsTo, hasMany } from '@ember-data/model';

export default Mixin.create({
  prop_trait_b_1: attr(),
  prop_trait_b_2: attr(),
  prop_trait_b_3: attr(),
  prop_trait_b_4: attr(),
  prop_trait_b_5: attr(),
  prop_trait_b_6: attr(),
  prop_trait_b_7: attr(),
  prop_trait_b_8: attr(),
  prop_trait_b_9: attr(),
  prop_trait_b_10: attr(),

  belongsTo_trait_b_a: belongsTo('record-mixin-a', {
    async: false,
    inverse: 'belongsTo_trait_a_b',
    polymorphic: true,
    as: 'record-mixin-b',
  }),
  hasMany_trait_b_c: hasMany('record-mixin-c', {
    async: false,
    inverse: 'hasMany_trait_c_b',
    polymorphic: true,
    as: 'record-mixin-b',
  }),
  hasMany_trait_b_d: hasMany('record-mixin-d', {
    async: false,
    inverse: null,
    polymorphic: true,
  }),
});
