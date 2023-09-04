import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import type Store from '@ember-data/store';
import type { Document } from '@ember-data/store/-private/document';

import type Book from '../models/book';

export interface InfiniteBookSignature {
  Element: HTMLUListElement;
  Args: {
    allBooks: Document<Book[]>;
  };
}

class Pages<T> {
  @tracked pages: Document<T[]>[] = [];
  @tracked data: T[] = [];

  constructor(page: Document<T[]>) {
    this.pages = [page];
    this.data = page.data!.slice();
  }

  addPage(page: Document<T[]>) {
    this.pages.push(page);
    this.data = this.data.concat(page.data!);
  }
}

export default class InfiniteBookComponent extends Component<InfiniteBookSignature> {
  @service declare store: Store;
  pageCollection = new Pages(this.args.allBooks);

  get books(): Book[] {
    return this.pageCollection.data;
  }

  next = async () => {
    const page = this.pageCollection.pages.at(-1);
    const result = await page?.next();
    if (result) {
      this.pageCollection.addPage(result);
    }
  };
}
