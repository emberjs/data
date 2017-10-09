/* global window, heimdall, console */
import Route from '@ember/routing/route';

// fallback if no-heimdall happens to be present when loading the dummy app
let heimdall = self.heimdall;
if (typeof heimdall !== 'object') {
  heimdall = {
    start() { },
    stop()  { }
  };
}


export default Route.extend({
  queryParams: {
    limit: {
      refreshModel: true
    },
    modelName: {
      refreshModel: true
    },
    included: {
      refreshModel: true
    },
    eagerMaterialize: {
      refreshModel: true
    },
    eagerRelationships: {
      refreshModel: true
    }
  },

  model(params) {
    // switch this to 'production' when generating production build baselines
    let modelName = params.modelName;
    delete params.modelName;

    let store = this.get('store');
    let token = heimdall.start('ember-data');
    return store.query(modelName, params)
      .then((records) => {
        let modelNames = [modelName, ...params.included.split(',')];
        let recordArrays = null;

        if (params.eagerMaterialize || params.eagerRelationships) {
          recordArrays = getRecordArrays(store, ...modelNames);
          // RecordArray lazily materializes the records
          // We call toArray() to force materialization for benchmarking
          // otherwise we would need to consume the RecordArray in our UI
          // and clutter our benchmarks and make it harder to time.
          materializeRecords(...recordArrays);
        }
        if (params.eagerRelationships) {
          expandAllRelationships(...recordArrays);
        }

        heimdall.stop(token);
        self.result = heimdall.toString();

        return records;
      });
  }
});

function getRecordArrays(store, ...modelNames) {
  return modelNames.map(modelName => store.peekAll(modelName));
}

function materializeRecords(...recordArrays) {
  recordArrays.forEach(records => records.toArray());
}

function expandAllRelationships(...recordArrays) {
  recordArrays.forEach(expandRelationships);
}


function expandRelationships(records, seen) {
  let obj = records.objectAt(0);
  if (!obj) { return; }

  records.objectAt(0).eachRelationship(rel => {
    records.forEach(record => {
      record._internalModel._relationships.get(rel);
    });
  });
}

