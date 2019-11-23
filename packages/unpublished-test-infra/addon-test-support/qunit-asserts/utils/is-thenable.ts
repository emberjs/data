export default function isThenable(obj: unknown): boolean {
  return typeof obj === 'object' && obj !== null && 'then' in obj;
}
