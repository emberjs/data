
export function assert(message: string): never;
export function assert(message: string, condition: unknown): asserts condition;

interface Available {
  available: string;
}
interface Enabled extends Available {
  enabled: string;
}
interface DeprecationOptions {
  id: string;
  until: string;
  url?: string;
  for: string;
  since: Available | Enabled;
}

// not available yet so not exported
function deprecate(
  message: string,
  test?: boolean,
  options?: DeprecationOptions
): void;
