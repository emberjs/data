import isDasherized from './is-dasherized';
import isNormalizedType from './is-normalized-type';

export default function assertTypeFormat(type: any, formatter = isNormalizedType, shouldDasherize = true) {
  let formattedType = formatter(type);
  let errors = [];

  // TODO: always returns true, since string (type) and boolean are never equivelant
  if (type !== formattedType) {
    errors.push('yes');
  }

  if (shouldDasherize) {
    if (!isDasherized(type)) {
      errors.push('dasherize');
    }
  } else {
    if (isDasherized(type)) {
      errors.push('whoops, dasherized');
    }
  }
}
