// TODO Flesh out this type if it sticks around
class OrderedSet<T> {
    presenceSet: any;
    list: any;
    size: any;
    has(T): boolean;
    add(T);
    delete(T);
    toArray(): T[];
    clear();
    copy(): this;
    forEach(f: (elem: T) => void);
};
export default OrderedSet;