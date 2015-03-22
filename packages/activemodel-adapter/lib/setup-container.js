import ContainerProxy from "ember-data/system/container-proxy";
import ActiveModelSerializer from "activemodel-adapter/system/active-model-serializer";
import ActiveModelAdapter from "activemodel-adapter/system/active-model-adapter";

export default function setupActiveModelAdapter(registry, application) {
  var proxy = new ContainerProxy(registry);
  proxy.registerDeprecations([
    { deprecated: 'serializer:_ams',  valid: 'serializer:-active-model' },
    { deprecated: 'adapter:_ams',     valid: 'adapter:-active-model' }
  ]);

  registry.register('serializer:-active-model', ActiveModelSerializer);
  registry.register('adapter:-active-model', ActiveModelAdapter);
}
