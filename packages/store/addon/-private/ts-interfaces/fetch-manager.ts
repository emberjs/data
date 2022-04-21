import type { Dict } from '@ember-data/store/-private/ts-interfaces/utils';
import type { ResolvedRegistry } from '@ember-data/types';
import type { RecordType } from '@ember-data/types/utils';

import type { RecordIdentifier } from './identifier';

export interface Operation<R extends ResolvedRegistry, T extends RecordType<R> = RecordType<R>> {
  op: string;
  options: Dict<unknown> | undefined;
  recordIdentifier: RecordIdentifier<T>;
}

export interface FindRecordQuery<R extends ResolvedRegistry, T extends RecordType<R> = RecordType<R>>
  extends Operation<R, T> {
  op: 'findRecord';
  recordIdentifier: RecordIdentifier<T>;
  options: Dict<unknown>;
}

export interface SaveRecordMutation<R extends ResolvedRegistry, T extends RecordType<R> = RecordType<R>>
  extends Operation<R, T> {
  op: 'saveRecord';
  recordIdentifier: RecordIdentifier<T>;
  options: Dict<unknown>;
}

export interface Request<R extends ResolvedRegistry, T extends RecordType<R> = RecordType<R>> {
  data: Operation<R, T>[];
  options?: Dict<unknown>;
}

export enum RequestStateEnum {
  pending = 'pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected',
}

export interface RequestState<R extends ResolvedRegistry, T extends RecordType<R> = RecordType<R>> {
  state: RequestStateEnum;
  type: 'query' | 'mutation';
  request: Request<R, T>;
  response?: Response;
}

export interface Response {
  // rawData: unknown;
  data: unknown;
}
