import DS from 'ember-data';
const { <%= importedModules %> } = DS;

export default Model.extend({
<%= attrs.length ? attrs : '' %>
});
