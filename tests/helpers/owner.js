import Ember from 'ember';

let Owner;

if (Ember._RegistryProxyMixin && Ember._ContainerProxyMixin) {
  Owner = Ember.Object.extend(Ember._RegistryProxyMixin, Ember._ContainerProxyMixin);
} else {
  Owner = Ember.Object.extend();
}

export default Owner;
