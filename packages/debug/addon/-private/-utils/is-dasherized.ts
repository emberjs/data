import { dasherize } from '@ember/string';

export default function isDasherized(str: string) {
  let dasherized = dasherize(str);

  return dasherized === str;
}
