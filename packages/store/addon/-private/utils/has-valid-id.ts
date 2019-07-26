/**
 * Ensures that one of id or clientId is not null|undefined|""
 *
 * Caution! casts "id" to string for type narrowing, as we are unable to
 * narrow the correct one in this manner.
 *
 * @internal
 */
export default function hasValidId(id?: string | null, clientId?: string | null): id is string {
  // weed out anything falsey
  if (!id && !clientId) {
    return false;
  }
  return true;
}
