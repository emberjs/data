import Component from '@glimmer/component';

export default class Paginate extends Component {
  <template>
    {{#if this.reqState.isLoading}}
      {{yield this.reqState.loadingState to="loading"}}
    {{else if (and this.reqState.isCancelled (has-block "cancelled"))}}
      {{yield (notNull this.reqState.error) this.errorFeatures to="cancelled"}}
    {{else if (and this.reqState.isError (has-block "error"))}}
      {{yield (notNull this.reqState.error) this.errorFeatures to="error"}}
    {{else if this.reqState.isSuccess}}
      {{yield this.result this.contentFeatures to="content"}}
    {{else if (not this.reqState.isCancelled)}}
      <Throw @error={{(notNull this.reqState.error)}} />
    {{/if}}
    {{yield this.reqState to="always"}}
  </template>
}
