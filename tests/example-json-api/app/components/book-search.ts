import { service } from '@ember/service';
import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';

import type Store from '@ember-data/store';

export interface BookSearchSignature {
  Element: HTMLDivElement;
  Args: null;
}

type SearchKeys = 'sort2' | 'sort' | 'title' | 'genre' | 'author' | 'sortDirection' | 'sort2Direction';

export default class BookListComponent extends Component<BookSearchSignature> {
  @service declare store: Store;

  @tracked sort: string | null = 'title';
  @tracked sort2: string | null = 'publicationDate';
  @tracked title: string | null = null;
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

  update = (event: InputEvent & { target: HTMLInputElement }): void => {
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
}
