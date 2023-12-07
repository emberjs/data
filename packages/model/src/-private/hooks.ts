import { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import Model from './model';

// FIXME: Implement or remove invocations
export function buildSchema() {
  throw new Error('unimplemented');
}

// FIXME: Implement or remove invocations
export function modelFor(this: unknown, modelName: string): typeof Model | void {
  throw new Error('unimplemented');
}

// FIXME: Implement or remove invocations
export function instantiateRecord(
  this: unknown,
  identifier: StableRecordIdentifier,
  createRecordArgs: { [key: string]: unknown }
): Model {
  throw new Error('unimplemented');
}

// FIXME: Implement or remove invocations
export function teardownRecord(record: Model) {
  throw new Error('unimplemented');
}
