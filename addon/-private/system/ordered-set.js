import Ember from 'ember';

const EmberOrderedSet = Ember.OrderedSet;
const guidFor = Ember.guidFor;

export default function OrderedSet() {
  this._super$constructor();
}

OrderedSet.create = function() {
  let Constructor = this;
  return new Constructor();
};

OrderedSet.prototype = Object.create(EmberOrderedSet.prototype);
OrderedSet.prototype.constructor = OrderedSet;
OrderedSet.prototype._super$constructor = EmberOrderedSet;

OrderedSet.prototype.addWithIndex = function(obj, idx) {
  let guid = guidFor(obj);
  let presenceSet = this.presenceSet;
  let list = this.list;

  if (presenceSet[guid] === true) {
    return;
  }

  presenceSet[guid] = true;

  if (idx === undefined || idx === null) {
    list.push(obj);
  } else {
    list.splice(idx, 0, obj);
  }

  this.size += 1;

  return this;
};
