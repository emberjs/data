import type ApplicationInstance from '@ember/application/instance';
import type { Store } from '@warp-drive/core';
import {
  EmberArrayLikeExtension,
  EmberObjectArrayExtension,
  EmberObjectExtension,
} from '@warp-drive/legacy/compat/extensions';

import { modelFor } from '#src/hooks/model-for.ts';
import FragmentArrayExtension from '../extensions/fragment-array.ts';
import FragmentExtension from '../extensions/fragment.ts';

export function registerFragmentExtensions(store: Store) {
  store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension?.(FragmentExtension);
  store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension?.(
    FragmentArrayExtension
  );
  store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension?.(
    EmberArrayLikeExtension
  );
  store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension?.(
    EmberObjectArrayExtension
  );
  store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension?.(
    EmberObjectExtension
  );
  store.modelFor = modelFor;
}

export function initialize(application: ApplicationInstance) {
  const store = application.lookup('service:store') as Store | undefined;

  if (store) {
    registerFragmentExtensions(store);
  } else {
    console.warn(
      'No store service was found, you will need to call `registerFragmentExtensions` manually in your app.'
    );
  }
}

export default {
  name: 'fragment-extensions',
  initialize,
};
