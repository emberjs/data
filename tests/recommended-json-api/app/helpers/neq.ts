export default function neq(compare: unknown, ...values: unknown[]): boolean {
  return !values.some((value) => compare === value);
}
