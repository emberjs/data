import { deprecate } from "ember-data/-private/debug";

/*
  This is used internally to enable deprecation of container paths and provide
  a decent message to the user indicating how to fix the issue.

  @class ContainerProxy
  @namespace DS
  @private
*/
export default function ContainerProxy(container) {
  this.container = container;
}

ContainerProxy.prototype.aliasedFactory = function(path, preLookup) {
  return {
    create: () => {
      if (preLookup) { preLookup(); }

      return this.container.lookup(path);
    }
  };
};

ContainerProxy.prototype.registerAlias = function(source, dest, preLookup) {
  var factory = this.aliasedFactory(dest, preLookup);

  return this.container.register(source, factory);
};

ContainerProxy.prototype.registerDeprecation = function(deprecated, valid) {
  var preLookupCallback = function() {
    deprecate(`You tried to look up '${deprecated}', but this has been deprecated in favor of '${valid}'.`, false, {
      id: 'ds.store.deprecated-lookup',
      until: '2.0.0'
    });
  };

  return this.registerAlias(deprecated, valid, preLookupCallback);
};

ContainerProxy.prototype.registerDeprecations = function(proxyPairs) {
  var i, proxyPair, deprecated, valid;

  for (i = proxyPairs.length; i > 0; i--) {
    proxyPair = proxyPairs[i - 1];
    deprecated = proxyPair['deprecated'];
    valid = proxyPair['valid'];

    this.registerDeprecation(deprecated, valid);
  }
};
