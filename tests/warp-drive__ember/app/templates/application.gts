import RouteTemplate from 'ember-route-template';

export default RouteTemplate(
  <template>
    <h1>WarpDrive Ember Tests</h1>

    {{outlet}}

    <a href="/tests">Tests</a>
  </template>
) as unknown;
