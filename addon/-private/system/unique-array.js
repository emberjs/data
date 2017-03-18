export default class UniqueArray {
  constructor(key) {
    this.key = key;
    this.seen = Object.create(null);
    this.items = [];
  }

  push(...additions) {
    let seen = this.seen;
    let items = this.items;
    let key = this.key;

    for (let i = 0; i < additions.length; i++) {
      let value = additions[i];
      if (value && !seen[value[key]]) {
        seen[value[key]] = true;
        items.push(value);
      }
    }
  }
}
