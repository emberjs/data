import RecordArray from "ember-data/-private/system/record-arrays/record-array";
import FilteredRecordArrayMixin from "ember-data/-private/system/record-arrays/mixins/filtered-record-array-mixin";

/**
  Represents a list of records whose membership is determined by the
  store. As records are created, loaded, or modified, the store
  evaluates them to determine if they should be part of the record
  array.

  @class FilteredRecordArray
  @namespace DS
  @extends DS.RecordArray
*/
export default RecordArray.extend(FilteredRecordArrayMixin);
