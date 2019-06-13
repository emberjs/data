export default function aboutAnOxfordComma(array: string[], quote = '`', joinWord = 'or') {
  let arr = array.slice();

  if (arr.length === 0) {
    throw new Error('No items to list from');
  }

  if (arr.length === 1) {
    return `${quote}${arr[0]}${quote}`;
  }

  let last = arr.pop();

  return quote + arr.join(quote + ', ' + quote) + quote + ' ' + joinWord + ' ' + quote + last + quote;
}
