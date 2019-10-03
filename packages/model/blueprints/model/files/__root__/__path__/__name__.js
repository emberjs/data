import Model<%= importedModules.length ? `, { ${importedModules} }` : '' %> from '@ember-data/model';

export default Model.extend({
<%= attrs.length ? attrs : '' %>
});
