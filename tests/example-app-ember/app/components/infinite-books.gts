import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import type { Store } from '@warp-drive/core';
import type { ReactiveDocument } from '@warp-drive/core/reactive';

import type { Book } from '../schemas/book';
// @ts-expect-error
import VerticalCollection from '@html-next/vertical-collection';

export interface InfiniteBookSignature {
  Element: HTMLUListElement;
  Args: {
    books: ReactiveDocument<Book[]>;
  };
}

class Pages<T> {
  @tracked pages: ReactiveDocument<T[]>[] = [];
  @tracked data: T[] = [];

  constructor(page: ReactiveDocument<T[]>) {
    this.pages = [page];
    this.data = page.data!.slice();
  }

  addPage(page: ReactiveDocument<T[]>): void {
    this.pages.push(page);
    this.data = this.data.concat(page.data!);
  }
}

export default class InfiniteBookComponent extends Component<InfiniteBookSignature> {
  @service declare store: Store;
  pageCollection: Pages<Book> = new Pages(this.args.books);

  get books(): Book[] {
    return this.pageCollection.data;
  }

  next = async (): Promise<void> => {
    const page = this.pageCollection.pages.at(-1);
    const result = await page?.next();
    if (result) {
      this.pageCollection.addPage(result);
    }
  };

  <template>
    <VerticalCollection
      @items={{this.books}}
      @tagName="ul"
      @staticHeight={{true}}
      @estimateHeight={{60}}
      @bufferSize={{10}}
      @lastReached={{this.next}}
      @containerSelector=".scroll-container"
      as |book|
    >
      <li>
        <strong>{{book.title}}</strong>
        ({{book.genre}}) -
        {{book.publicationDate}}
        <br />
        by
        <em>{{book.author}}</em>
        ISBN:
        {{book.isbn}}
      </li>
    </VerticalCollection>
  </template>
}
