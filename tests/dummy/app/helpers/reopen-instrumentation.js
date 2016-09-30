/* global heimdall */
import Ember from 'ember';
import DS from "ember-data";

const {
  Model
} = DS;

const {
  Object: Obj
} = Ember;

export default function instrumentBaseObjects(owner) {
  const [__a, __b] = heimdall.registerMonitor('owner', 'lookup', '_lookupFactory');
  let originalLookup = owner.lookup;
  let originalLookupFactory = owner._lookupFactory;

  owner.lookup = function lookup() {
    heimdall.increment(__a);
    return originalLookup.apply(this, arguments);
  };

  owner._lookupFactory = function _lookupFactory() {
    heimdall.increment(__b);
    return originalLookupFactory.apply(this, arguments);
  };

  const [__c] = heimdall.registerMonitor('reopened-model', '_create');
  const [__d, __e] = heimdall.registerMonitor('reopened-object', 'create', 'extend');
  let originalModelCreate = Model._create;
  let originalCreate = Obj.create;
  let originalExtend = Obj.extend;

  Model.reopenClass({
    _create() {
      heimdall.increment(__c);
      return originalModelCreate.apply(this, arguments);
    }
  });

  Obj.reopenClass({
    create() {
      heimdall.increment(__d);
      return originalCreate.apply(this, arguments);
    },
    extend() {
      heimdall.increment(__e);
      return originalExtend.apply(this, arguments);
    }
  });
}
