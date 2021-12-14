type Dict<T> = import('@ember-data/store/-private/ts-interfaces/utils').Dict<T>;

type RecordIdentifier = import('./identifier').RecordIdentifier;

export interface Operation {
  op: string;
  options: Dict<unknown> | undefined;
  recordIdentifier: RecordIdentifier;
}

export interface FindRecordQuery extends Operation {
  op: 'findRecord';
  recordIdentifier: RecordIdentifier;
  options: any;
}

export interface SaveRecordMutation extends Operation {
  op: 'saveRecord';
  recordIdentifier: RecordIdentifier;
  options: any;
}

export interface Request {
  data: Operation[];
  options?: any;
}

export enum RequestStateEnum {
  pending = 'pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected',
}

export interface RequestState {
  state: RequestStateEnum;
  type: 'query' | 'mutation';
  request: Request;
  response?: Response;
}

export interface Response {
  // rawData: unknown;
  data: unknown;
}
