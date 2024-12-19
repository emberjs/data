export function assert(message: string, condition: unknown): asserts condition;
export function assert(message: string): never;
export function assert(message: string, condition?: unknown): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
