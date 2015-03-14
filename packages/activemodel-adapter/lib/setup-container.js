import ContainerProxy from "ember-data/system/container-proxy";
import ActiveModelSerializer from "activemodel-adapter/system/active-model-serializer";
import ActiveModelAdapter from "activemodel-adapter/system/active-model-adapter";

export default function setupActiveModelAdapter(container, application) {
  var proxy = new ContainerProxy(container);
  proxy.registerDeprecations([
    { deprecated: 'serializer:_ams',  valid: 'serializer:-active-model' },
    { deprecated: 'adapter:_ams',     valid: 'adapter:-active-model' }
  ]);

  container.register('serializer:-active-model', ActiveModelSerializer);
  container.register('adapter:-active-model', ActiveModelAdapter);
}
