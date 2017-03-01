import Ember from 'ember';
import DS from 'ember-data';

export default function(env, adapterDefinition) {
  let adapter = adapterDefinition;
  if (!DS.Adapter.detect(adapterDefinition)) {
    adapter = DS.Adapter.extend(adapterDefinition);
  }
  let store = env.store;
  env.registry.register('adapter:-custom', adapter);
  Ember.run(() => store.set('adapter', '-custom'));
}
