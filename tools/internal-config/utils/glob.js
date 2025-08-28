import { sync } from 'glob';

export function globSync(pattern, options) {
  let result = [];
  sync(pattern, options).forEach((file) => {
    result.push(file);
  });
  return result;
}
