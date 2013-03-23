require('ember-data/serializers/json_serializer');

var get = Ember.get, set = Ember.set;

/**
  Serializer for use with Grails
 */
DS.GrailsSerializer = DS.JSONSerializer.extend({
  /**
   Do not pluralize any URLs or attributes; use them verbatim
   */
  pluralize: function(name) {
    return name;
  },
  /**
   URLs for Grails should follow the default Grails controller naming
   mechanism.  Given a domain class MyCoolDomain, the default controller
   name will be MyCoolDomainController, which resides at the URL
   /${grails.app.context}/myCoolDomain
   */
  rootForType: function(type) {
    var typeString = type.toString();
    Ember.assert("Your model must not be anonymous. It was " + type, typeString.charAt(0) !== '(');
    var parts = typeString.split(".");
    var name = parts[parts.length - 1];
    return name.charAt(0).toLowerCase() + name.slice(1);
  },
  /**
   Grails' default JSON serializer turns has-one and belongs-to into
   a map with the format `{ class: "com.foo.MyCoolDomain", id: 1 }`

   ember-data expects the ID to be a straight ID.

   `addBelongsTo` is called during serialization, so we must create
   the hash to contain the `id` property.

   This is identical to the JSONSerializer belongsTo, except for the
   the statements in the very last block.
   */
  addBelongsTo: function(hash, record, key, relationship) {
    var type = record.constructor,
        name = relationship.key,
        value = null,
        embeddedChild;

    if (this.embeddedType(type, name)) {
      if (embeddedChild = get(record, name)) {
        value = this.serialize(embeddedChild, { includeId: true });
      }

      hash[key] = value;
    } else {
      var id = get(record, relationship.key+'.id');
      if (!Ember.isNone(id)) { 
        hash[key] = {};
        hash[key + '.' + this.primaryKey(type)] = id;
      }
    }
  },
  /**
   Inverse of the overridden `addBelongsTo`; extracts the `id` property from
   the hash created by Grails' JSON serializer.
   */
  extractBelongsTo: function(type, hash, key) {
    return hash[key][this.primaryKey(type)];
  }
});
