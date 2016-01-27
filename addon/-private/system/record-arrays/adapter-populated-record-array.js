import RecordArray from "ember-data/-private/system/record-arrays/record-array";
import AdapterPopulatedRecordArrayMixin from "ember-data/-private/system/record-arrays/mixins/adapter-populated-record-array-mixin";

/**
  Represents an ordered list of records whose order and membership is
  determined by the adapter. For example, a query sent to the adapter
  may trigger a search on the server, whose results would be loaded
  into an instance of the `AdapterPopulatedRecordArray`.

  @class AdapterPopulatedRecordArray
  @namespace DS
  @extends DS.RecordArray
*/
export default RecordArray.extend(AdapterPopulatedRecordArrayMixin);
