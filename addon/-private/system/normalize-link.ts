/*
  This method normalizes a link to an "links object". If the passed link is
  already an object it's returned without any modifications.

  See http://jsonapi.org/format/#document-links for more information.

  @method _normalizeLink
  @private
  @param {String} link
  @return {Object|null}
  @for DS
*/
export default function _normalizeLink(link: Link | string | null): Nullable<Link> {
  if (link === null) return null;

  switch (typeof link) {
    case 'object':
      return link;
    case 'string':
      return { href: link };
    default:
      throw new Error('this should be unreachable?');
  }
}
