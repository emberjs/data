import type { StableRecordIdentifier } from './identifier';

export interface Operation {
  op: string;
  options: Record<string, unknown> | undefined;
  recordIdentifier: StableRecordIdentifier;
}

export interface FindRecordQuery extends Operation {
  op: 'findRecord';
  recordIdentifier: StableRecordIdentifier;
  options: any;
}

export interface SaveRecordMutation extends Operation {
  op: 'saveRecord';
  recordIdentifier: StableRecordIdentifier;
  options: any;
}

export interface Request {
  data: Operation[];
  options?: any;
}

export type RequestStates = 'pending' | 'fulfilled' | 'rejected';

export interface RequestState {
  state: RequestStates;
  type: 'query' | 'mutation';
  request: Request;
  response?: Response;
}

export interface Response {
  // rawData: unknown;
  data: unknown;
}
