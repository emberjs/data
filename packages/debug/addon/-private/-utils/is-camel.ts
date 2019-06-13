import { camelize } from '@ember/string';

export default function isCamel(str: string) {
  let camelized = camelize(str);

  return camelized === str;
}
