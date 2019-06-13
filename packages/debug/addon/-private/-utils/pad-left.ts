export default function padLeft(str: string, count = 0, char = ' '): string {
  let s = '';

  while (count--) {
    s += char;
  }

  return s + str;
}
