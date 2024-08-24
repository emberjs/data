export type SuccessResponseEventData = {
  type: 'success-response';
  thread: string;
  url: string;
};
export type ErrorResponseEventData = {
  type: 'error-response';
  thread: string;
  url: string;
};

export type RequestEventData = {
  type: 'load';
  thread: string;
  url: string;
};

export type ThreadInitEventData = {
  type: 'connect';
  thread: string;
};

export type MainThreadEvent = MessageEvent<SuccessResponseEventData | ErrorResponseEventData>;
export type WorkerThreadEvent = MessageEvent<RequestEventData> | MessageEvent<ThreadInitEventData>;
