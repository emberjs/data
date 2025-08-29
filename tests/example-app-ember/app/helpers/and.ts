export default function and(...args: unknown[]): boolean {
  return args.every(Boolean);
}
