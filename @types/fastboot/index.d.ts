interface Request {
  protocol: string;
  host: string;
}
export interface FastBoot {
  require(moduleName: string): unknown;
  isFastBoot: boolean;
  request: Request;
}

declare global {
  const FastBoot: undefined | FastBoot;
}
