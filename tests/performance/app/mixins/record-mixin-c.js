// eslint-disable-next-line no-restricted-imports
import Mixin from '@ember/object/mixin';

import { attr, hasMany } from '@ember-data/model';

export default Mixin.create({
  prop_trait_c_1: attr(),
  prop_trait_c_2: attr(),
  prop_trait_c_3: attr(),
  prop_trait_c_4: attr(),
  prop_trait_c_5: attr(),
  prop_trait_c_6: attr(),
  prop_trait_c_7: attr(),
  prop_trait_c_8: attr(),
  prop_trait_c_9: attr(),
  prop_trait_c_10: attr(),

  hasMany_trait_c_a: hasMany('record-mixin-a', {
    async: false,
    inverse: 'belongsTo_trait_a_c',
    polymorphic: true,
    as: 'record-mixin-c',
  }),
  hasMany_trait_c_b: hasMany('record-mixin-b', {
    async: false,
    inverse: 'hasMany_trait_b_c',
    polymorphic: true,
    as: 'record-mixin-c',
  }),
  hasMany_trait_c_d: hasMany('record-mixin-d', {
    async: false,
    inverse: null,
    polymorphic: true,
  }),
});
