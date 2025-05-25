import type { RequestInfo, StructuredDataDocument, StructuredErrorDocument } from '@warp-drive/core/types/request';

export type SuccessResponseEventData<T> = {
  type: 'success-response';
  thread: string;
  id: number;
  data: StructuredDataDocument<T>;
};
export type ErrorResponseEventData<T> = {
  type: 'error-response';
  thread: string;
  id: number;
  data: StructuredErrorDocument<T>;
};

export type RequestEventData = {
  type: 'request';
  thread: string;
  id: number;
  data: RequestInfo;
};

export type AbortEventData = {
  type: 'abort';
  thread: string;
  id: number;
  data: string;
};

export type ThreadInitEventData = {
  type: 'connect';
  thread: string;
};

export type MainThreadEvent<T> = MessageEvent<SuccessResponseEventData<T> | ErrorResponseEventData<T>>;
export type WorkerThreadEvent =
  | MessageEvent<RequestEventData>
  | MessageEvent<ThreadInitEventData>
  | MessageEvent<AbortEventData>;
