import EmberObject from '@ember/object';
import Ember from 'ember';

let Owner;

if (Ember._RegistryProxyMixin && Ember._ContainerProxyMixin) {
  Owner = EmberObject.extend(Ember._RegistryProxyMixin, Ember._ContainerProxyMixin);
} else {
  Owner = EmberObject.extend();
}

export default Owner;
