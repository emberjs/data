import OrderedSet from './ordered-set';

export default class UniqueArray {
  constructor() {
    this.set = new OrderedSet();
  }

  get items() {
    return this.set.list;
  }

  push(...additions) {
    const set = this.set;

    for (let i = 0; i < additions.length; i++) {
      let value = additions[i];

      if (value) {
        set.add(value);
      }
    }

    return set.size;
  }
}
