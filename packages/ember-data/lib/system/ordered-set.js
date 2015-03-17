var EmberOrderedSet = Ember.OrderedSet;
var guidFor = Ember.guidFor;

var OrderedSet = function() {
  this._super$constructor();
};

OrderedSet.create = function() {
  var Constructor = this;
  return new Constructor();
};

OrderedSet.prototype = Ember.create(EmberOrderedSet.prototype);
OrderedSet.prototype.constructor = OrderedSet;
OrderedSet.prototype._super$constructor = EmberOrderedSet;

OrderedSet.prototype.addWithIndex = function(obj, idx) {
  var guid = guidFor(obj);
  var presenceSet = this.presenceSet;
  var list = this.list;

  if (presenceSet[guid] === true) {
    return;
  }

  presenceSet[guid] = true;

  if (idx === undefined || idx == null) {
    list.push(obj);
  } else {
    list.splice(idx, 0, obj);
  }

  this.size += 1;

  return this;
};

export default OrderedSet;
