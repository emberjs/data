import DS from 'ember-data';
const { <%= importedModules %> } = DS;

export default class <%= classifiedModuleName %>Model extends Model {
<%= attrs.length ? attrs : '' %>
}
