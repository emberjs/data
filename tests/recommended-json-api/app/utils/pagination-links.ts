import { assert } from '@ember-data/macros';
import { tracked } from '@glimmer/tracking';

type ApiMeta = {
  currentPage: number;
  pagesTotal: number;
};
type ApiLinks = {
  self: string;
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
};

export type ApiPage = {
  meta: ApiMeta;
  links: ApiLinks;
};

export class PaginationLinks {
  declare _pages: string[];
  @tracked declare pages: string[];

  addPage(page: ApiPage) {
    let { _pages } = this;
    const { pagesTotal, currentPage } = page.meta;

    if (currentPage === 1 && (!_pages || _pages[0] !== page.links.self)) {
      _pages = this._pages = new Array(pagesTotal).fill('.') as string[];
    } else if (pagesTotal !== _pages.length) {
      const cached = _pages;
      _pages = this._pages = new Array(pagesTotal).fill('.') as string[];
      for (let i = 0; i < pagesTotal; i++) {
        _pages[i] = cached[i]!;
      }
    }
    const pages = _pages;

    pages[currentPage - 1] = page.links.self;

    pages[0] = page.links.first;
    pages[pagesTotal - 1] = page.links.last;
    if (pagesTotal > 1 && currentPage > 1) {
      assert('previous page should exist', page.links.prev);
      pages[currentPage - 2] = page.links.prev;
    }
    if (pagesTotal > 1 && currentPage < pagesTotal - 1) {
      assert('next page should exist', page.links.next);
      pages[currentPage] = page.links.next;
    }

    this.pages = pages;
  }

  get filteredPages() {
    const { pages } = this;
    const filtered: { index: number; link: string }[] = [];

    for (let i = 0; i < pages.length; i++) {
      if (pages[i] !== '.') {
        filtered.push({ index: i + 1, link: pages[i] });
      } else if (filtered.length > 0 && filtered[filtered.length - 1]!.link !== '...') {
        filtered.push({ index: i + 1, link: '...' });
      }
    }
    return filtered;
  }
}
