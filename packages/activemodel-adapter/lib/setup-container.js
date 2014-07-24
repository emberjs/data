import ContainerProxy from "../../ember-data/lib/system/container_proxy";
import ActiveModelSerializer from "./system/active_model_serializer";
import ActiveModelAdapter from "./system/active_model_adapter";

export default function setupActiveModelAdapter(container, application){
  var proxy = new ContainerProxy(container);
  proxy.registerDeprecations([
    { deprecated: 'serializer:_ams',  valid: 'serializer:-active-model' },
    { deprecated: 'adapter:_ams',     valid: 'adapter:-active-model' }
  ]);

  container.register('serializer:-active-model', ActiveModelSerializer);
  container.register('adapter:-active-model', ActiveModelAdapter);
};
