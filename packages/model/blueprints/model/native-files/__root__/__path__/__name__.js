import Model<%= importedModules.length ? `, { ${importedModules} }` : '' %> from '@ember-data/model';

export default class <%= classifiedModuleName %>Model extends Model {
<%= attrs.length ? attrs : '' %>
}
