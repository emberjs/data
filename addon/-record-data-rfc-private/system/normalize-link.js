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
export default function _normalizeLink(link) {
  switch (typeof link) {
    case 'object': return link;
    case 'string': return { href: link };
  }
  return null;
}
