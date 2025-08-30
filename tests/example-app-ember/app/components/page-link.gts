import or from '../helpers/or';
import eq from '../helpers/eq';
import not from '../helpers/not';
import type { TOC } from '@ember/component/template-only';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';

const PageLink: TOC<{
  link: string;
  title: string;
  text: string;
  action: (link: string) => void;
}> = <template>
  {{#if (or (eq @link ".") (eq @link "..."))}}{{@link}}{{else}}
    <button
      ...attributes
      title="{{@title}}"
      type="button"
      {{on "click" (fn @action @link)}}
      disabled={{not @link}}
    >{{@text}}</button>
  {{/if}}
</template>;

export default PageLink;
