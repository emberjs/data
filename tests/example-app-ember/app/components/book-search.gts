import { service } from '@ember/service';
import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';

import type { Store } from '@warp-drive/core';
import BookList from './book-list.gts';
import { on } from '@ember/modifier';
import not from '../helpers/not';
import eq from '../helpers/eq';

export interface BookSearchSignature {
  Element: HTMLDivElement;
  Args: null;
}

function assertDomEvent(event: Event): asserts event is InputEvent & { target: HTMLInputElement } {}

type SearchKeys = 'sort2' | 'sort' | 'title' | 'genre' | 'author' | 'sortDirection' | 'sort2Direction';

export default class BookListComponent extends Component<BookSearchSignature> {
  @service declare store: Store;

  @tracked sort: string | null = 'title';
  @tracked sort2: string | null = 'publicationDate';
  @tracked title: string = '';
  @tracked genre: string | null = null;
  @tracked author: string | null = null;
  @tracked sortDirection = 'asc';
  @tracked sort2Direction = 'asc';
  _lastSortDirection = 'asc';
  _lastSort2Direction = 'asc';

  @cached
  get sortOptions(): string[] {
    const fields = this.store.schema.fields({ type: 'book' });
    return Array.from(fields.keys()).filter((key) => fields.get(key)!.kind === 'attribute');
  }

  @cached
  get sortQuery(): string {
    const sort1 = this.sort ? `${this.sort}:${this.sortDirection}` : '';
    const sort2 = sort1 && this.sort2 ? `${this.sort2}:${this.sort2Direction}` : '';
    return sort2 ? `${sort1},${sort2}` : sort1;
  }

  update = (event: Event): void => {
    assertDomEvent(event);
    event.preventDefault();
    const name = event.target.id as SearchKeys;
    this[name] = event.target.value;

    if (name === 'sort') {
      this.sortDirection =
        event.target.value === '' ? '' : this._lastSortDirection === '' ? 'asc' : this._lastSortDirection;
      this._lastSortDirection = this.sortDirection;
    }

    if (name === 'sort2') {
      this.sort2Direction =
        event.target.value === '' ? '' : this._lastSort2Direction === '' ? 'asc' : this._lastSort2Direction;
      this._lastSort2Direction = this.sort2Direction;
    }
  };

  <template>
    <div>
      <label for="author">Author</label>
      <select name="author" id="author" {{on "input" this.update}}>
        <option value="">--</option>
        {{#each @authors as |author|}}
          <option value={{author.name}} selected={{eq this.author author.name}}>{{author.name}}</option>
        {{/each}}
      </select>

      <label for="genre">Genre</label>
      <select name="genre" id="genre" {{on "input" this.update}}>
        <option value="">--</option>
        {{#each @genres as |genre|}}
          <option value={{genre.name}} selected={{eq this.genre genre.name}}>{{genre.name}}</option>
        {{/each}}
      </select>

      <label for="title">Title Includes</label>
      <input type="text" name="title" id="title" placeholder="--" value={{this.title}} {{on "input" this.update}} />

      <br />

      <label for="sort">Sort By</label>
      <select name="sort" id="sort" {{on "input" this.update}}>
        <option value="">--</option>
        {{#each this.sortOptions as |sortOption|}}
          <option value={{sortOption}} selected={{eq this.sort sortOption}}>{{sortOption}}</option>
        {{/each}}
      </select>

      <label for="sortDirection">Direction</label>
      <select name="sort direction" id="sortDirection" disabled={{not this.sort}} {{on "input" this.update}}>
        {{#if this.sort}}
          <option value="asc" selected={{eq this.sortDirection "asc"}}>Ascending</option>
          <option value="desc" selected={{eq this.sortDirection "desc"}}>Descending</option>
        {{else}}
          <option value="">--</option>
        {{/if}}
      </select>

      {{#if this.sort}}
        <label for="sort2">Then Sort By</label>
        <select name="secondary sort" id="sort2" {{on "input" this.update}}>
          <option value="">--</option>
          {{#each this.sortOptions as |sortOption|}}
            <option value={{sortOption}} selected={{eq this.sort2 sortOption}}>{{sortOption}}</option>
          {{/each}}
        </select>

        <label for="sort2Direction">Direction</label>
        <select
          name="secondary sort direction"
          id="sort2Direction"
          disabled={{not this.sort2}}
          {{on "input" this.update}}
        >
          {{#if this.sort2}}
            <option value="asc" selected={{eq this.sort2Direction "asc"}}>Ascending</option>
            <option value="desc" selected={{eq this.sort2Direction "desc"}}>Descending</option>
          {{else}}
            <option value="">--</option>
          {{/if}}
        </select>
      {{/if}}

      <hr />
    </div>
    <BookList
      @page={{null}}
      @limit={{null}}
      @genre={{this.genre}}
      @author={{this.author}}
      @filter={{this.title}}
      @sort={{this.sortQuery}}
    />
  </template>
}
