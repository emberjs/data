import DS from 'ember-data';
const { Model } = DS;

export default class <%= classifiedModuleName %>Model extends Model {
<%= attrs.length ? attrs : '' %>
}
