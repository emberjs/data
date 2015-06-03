import Model from "ember-data/system/model";

Model.reopen({

  /**
    Provides info about the model for debugging purposes
    by grouping the properties into more semantic groups.

    Meant to be used by debugging tools such as the Chrome Ember Extension.

    - Groups all attributes in "Attributes" group.
    - Groups all belongsTo relationships in "Belongs To" group.
    - Groups all hasMany relationships in "Has Many" group.
    - Groups all flags in "Flags" group.
    - Flags relationship CPs as expensive properties.

    @method _debugInfo
    @for DS.Model
    @private
  */
  _debugInfo() {
    var attributes = ['id'];
    var relationships = { belongsTo: [], hasMany: [] };
    var expensiveProperties = [];

    this.eachAttribute(function(name, meta) {
      attributes.push(name);
    }, this);

    this.eachRelationship(function(name, relationship) {
      relationships[relationship.kind].push(name);
      expensiveProperties.push(name);
    });

    var groups = [
      {
        name: 'Attributes',
        properties: attributes,
        expand: true
      },
      {
        name: 'Belongs To',
        properties: relationships.belongsTo,
        expand: true
      },
      {
        name: 'Has Many',
        properties: relationships.hasMany,
        expand: true
      },
      {
        name: 'Flags',
        properties: ['isLoaded', 'isDirty', 'isSaving', 'isDeleted', 'isError', 'isNew', 'isValid']
      }
    ];

    return {
      propertyInfo: {
        // include all other mixins / properties (not just the grouped ones)
        includeOtherProperties: true,
        groups: groups,
        // don't pre-calculate unless cached
        expensiveProperties: expensiveProperties
      }
    };
  }
});

export default Model;
