export interface Request {
  protocol: string;
  host: string;
}

export interface FastBoot {
  isFastBoot: boolean;
  request: Request;
}
