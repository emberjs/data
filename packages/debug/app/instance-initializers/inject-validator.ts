import { DEBUG } from '@glimmer/env';

export default {
  name: 'inject-validator',
  initialize(instance) {
    if (DEBUG) {
      const store = instance.lookup('service:store');
      const validator = instance.lookup('service:validator');

      const _push: (document: unknown) => unknown = store._push;
      store._push = (document: unknown) => {
        validator.validateDocument(document);
        return _push.call(store, document);
      };
    }
  },
};
