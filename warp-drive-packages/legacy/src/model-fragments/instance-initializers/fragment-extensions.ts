import type ApplicationInstance from '@ember/application/instance';

import type { Store } from '@warp-drive/core';
import type { SchemaService } from '@warp-drive/core/types';

import FragmentExtension from '../extensions/fragment.ts';
import FragmentArrayExtension from '../extensions/fragment-array.ts';

export function registerFragmentExtensions(schema: SchemaService): void {
  schema.CAUTION_MEGA_DANGER_ZONE_registerExtension?.(FragmentExtension);
  schema.CAUTION_MEGA_DANGER_ZONE_registerExtension?.(FragmentArrayExtension);
}

export function initialize(application: ApplicationInstance): void {
  const store = application.lookup('service:store') as Store | undefined;

  if (store) {
    registerFragmentExtensions(store.schema);
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      'No store service was found, you will need to call `registerFragmentExtensions` manually in your app.'
    );
  }
}

export default {
  name: 'fragment-extensions',
  initialize: initialize as (application: ApplicationInstance) => void,
};
