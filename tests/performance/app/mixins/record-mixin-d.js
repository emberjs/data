// eslint-disable-next-line no-restricted-imports
import Mixin from '@ember/object/mixin';

import { attr, hasMany } from '@ember-data/model';

export default Mixin.create({
  prop_trait_d_1: attr(),
  prop_trait_d_2: attr(),
  prop_trait_d_3: attr(),
  prop_trait_d_4: attr(),
  prop_trait_d_5: attr(),
  prop_trait_d_6: attr(),
  prop_trait_d_7: attr(),
  prop_trait_d_8: attr(),
  prop_trait_d_9: attr(),
  prop_trait_d_10: attr(),

  hasMany_trait_d_c: hasMany('record-mixin-c', {
    async: false,
    inverse: null,
    polymorphic: true,
  }),
});
