export interface Request {
  method: string;
  body: unknown;
  cookies: unknown;
  headers: unknown;
  queryParams: unknown;
  path: string;
  protocol: string;
  host: string;
}

interface Shoebox {
  put(key: string, value: unknown): void;
  retrieve(key: string): undefined | JSON;
}

export interface Fastboot {
  isFastBoot: boolean;
  request: Request;
  shoebox: Shoebox;
  response: unknown; // need types
  metadata: unknown; // need types
  deferRendering(promise: Promise<unknown>): unknown;
}
