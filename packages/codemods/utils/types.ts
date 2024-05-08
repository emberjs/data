export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export type ValueOfSet<T> = T extends Set<infer V> ? V : never;
