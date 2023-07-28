import { assert } from '@ember/debug';
import { underscore } from '@ember/string';

import { pluralize } from 'ember-inflector';

import {
  buildBaseURL,
  type CreateRecordUrlOptions,
  type DeleteRecordUrlOptions,
  type UpdateRecordUrlOptions,
} from '@ember-data/request-utils';
import { recordIdentifierFor } from '@ember-data/store';
import type { StableExistingRecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import {
  ConstrainedRequestOptions,
  CreateRequestOptions,
  DeleteRequestOptions,
  UpdateRequestOptions,
} from '@ember-data/types/request';

import { copyForwardUrlOptions } from './-utils';

function isExisting(identifier: StableRecordIdentifier): identifier is StableExistingRecordIdentifier {
  return 'id' in identifier && identifier.id !== null && 'type' in identifier && identifier.type !== null;
}

export function deleteRecord(record: unknown, options: ConstrainedRequestOptions = {}): DeleteRequestOptions {
  const identifier = recordIdentifierFor(record);
  assert(`Expected to be given a record instance`, identifier);
  assert(`Cannot delete a record that does not have an associated type and id.`, isExisting(identifier));

  const urlOptions: DeleteRecordUrlOptions = {
    identifier: identifier,
    op: 'deleteRecord',
    resourcePath: pluralize(underscore(identifier.type)),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildBaseURL(urlOptions);
  const headers = new Headers();
  headers.append('Content-Type', 'application/json; charset=utf-8');

  return {
    url,
    method: 'DELETE',
    headers,
    op: 'deleteRecord',
    data: {
      record: identifier,
    },
  };
}

export function createRecord(record: unknown, options: ConstrainedRequestOptions = {}): CreateRequestOptions {
  const identifier = recordIdentifierFor(record);
  assert(`Expected to be given a record instance`, identifier);
  assert(`Cannot delete a record that does not have an associated type and id.`, isExisting(identifier));

  const urlOptions: CreateRecordUrlOptions = {
    identifier: identifier,
    op: 'createRecord',
    resourcePath: pluralize(underscore(identifier.type)),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildBaseURL(urlOptions);
  const headers = new Headers();
  headers.append('Content-Type', 'application/json; charset=utf-8');

  return {
    url,
    method: 'POST',
    headers,
    op: 'createRecord',
    data: {
      record: identifier,
    },
  };
}

export function updateRecord(
  record: unknown,
  options: ConstrainedRequestOptions & { patch?: boolean } = {}
): UpdateRequestOptions {
  const identifier = recordIdentifierFor(record);
  assert(`Expected to be given a record instance`, identifier);
  assert(`Cannot delete a record that does not have an associated type and id.`, isExisting(identifier));

  const urlOptions: UpdateRecordUrlOptions = {
    identifier: identifier,
    op: 'updateRecord',
    resourcePath: pluralize(underscore(identifier.type)),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildBaseURL(urlOptions);
  const headers = new Headers();
  headers.append('Content-Type', 'application/json; charset=utf-8');

  return {
    url,
    method: options.patch ? 'PATCH' : 'PUT',
    headers,
    op: 'updateRecord',
    data: {
      record: identifier,
    },
  };
}
