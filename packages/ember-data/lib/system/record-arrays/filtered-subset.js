var FilteredSubset = Ember.ArrayProxy.extend({
  init: function() {
    this._super(...arguments);

    var { filterByArgs, recordArray } = this.getProperties('filterByArgs', 'recordArray');
    var [key] = filterByArgs;

    var path = `recordArray.@each.${key}`;
    Ember.defineProperty(this, 'content', Ember.computed(path, function() {
      return this.filterBy.apply(recordArray, filterByArgs);
    }));
  }
});

export default FilteredSubset;
