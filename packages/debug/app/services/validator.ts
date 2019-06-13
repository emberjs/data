import { DEBUG } from '@glimmer/env';
import Service, { inject as service } from '@ember/service';
import { validateDocument } from '@ember-data/debug/-private';

const ValidatorService = Service.extend({
  store: service(),

  validateDocument(document: unknown) {
    validateDocument(this, document);
  },

  _supportsType(type: string): boolean {
    const hasTraditionalModel = this.store._hasModelFor(type);

    return hasTraditionalModel;
  },

  _attributeSchemaFor(identifier, resourcePayload) {},

  _relationshipSchemaFor(identifier, resourcePayload) {},
});

export default (DEBUG ? ValidatorService : {});
