import normalizeType from './normalize-type';

export default function isNormalized(type: string) {
  let normalized = normalizeType(type);

  return normalized === type;
}
