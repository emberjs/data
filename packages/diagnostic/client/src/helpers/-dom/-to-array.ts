/**
  @private
  @param {NodeList} nodelist the nodelist to convert to an array
  @returns {Array} an array
*/
export default function toArray<T extends Node>(nodelist: NodeListOf<T>): T[] {
  const array = new Array(nodelist.length) as T[];
  for (let i = 0; i < nodelist.length; i++) {
    array[i] = nodelist[i];
  }

  return array;
}
