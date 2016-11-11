import Ember from "ember";

export default Ember.Mixin.create({

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
    let attributes = ['id'];
    let relationships = { };
    let expensiveProperties = [];

    this.eachAttribute((name, meta) => attributes.push(name));

    let groups = [
      {
        name: 'Attributes',
        properties: attributes,
        expand: true
      }
    ];

    this.eachRelationship((name, relationship) => {
      let properties = relationships[relationship.kind];

      if (properties === undefined) {
        properties = relationships[relationship.kind] = [];
        groups.push({
          name: relationship.name,
          properties,
          expand: true
        });
      }
      properties.push(name);
      expensiveProperties.push(name);
    });

    groups.push({
      name: 'Flags',
      properties: ['isLoaded', 'hasDirtyAttributes', 'isSaving', 'isDeleted', 'isError', 'isNew', 'isValid']
    });

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
