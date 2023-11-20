'use strict';
const RAW_BOOKS = require('./MOCK_DATA.json');

const DEFAULT_LIMIT = 20;
const BOOKS = RAW_BOOKS.map((book, index) => {
  return {
    id: `${index + 1}`,
    type: 'book',
    attributes: book,
  };
});
const AUTHORS = RAW_BOOKS.reduce((acc, book) => {
  if (!acc.includes(book.author)) {
    acc.push(book.author);
  }
  return acc;
}, []).map((author, index) => {
  const resource = {
    id: `${index + 1}`,
    type: 'author',
    attributes: {
      name: author,
    },
  };
  return resource;
});
const CATEGORIES = RAW_BOOKS.reduce((acc, book) => {
  if (!acc.includes(book.genre)) {
    acc.push(book.genre);
  }
  return acc;
}, []).map((category, index) => {
  const resource = {
    id: `${index + 1}`,
    type: 'genre',
    attributes: {
      name: category,
    },
  };
  return resource;
});

function getPage(books, page = 1, limit = DEFAULT_LIMIT) {
  const start = (page - 1) * limit;
  const end = page * limit;
  return books.slice(start, end);
}

function buildLink(page = 1, limit = DEFAULT_LIMIT, filter, sort, author, genre) {
  const url = '/api/books';
  const params = [];
  if (author) {
    params.push(`author=${author}`);
  }
  if (filter) {
    params.push(`filter=${filter}`);
  }
  if (genre) {
    params.push(`genre=${genre}`);
  }
  if (limit) {
    params.push(`limit=${limit}`);
  }
  if (page) {
    params.push(`page=${page}`);
  }
  if (sort) {
    params.push(`sort=${sort}`);
  }

  return params.length ? url + '?' + params.join('&') : url;
}

function getMeta(books, page, limit) {
  return {
    currentPage: page,
    pagesTotal: Math.ceil(books.length / limit),
    booksTotal: books.length,
  };
}

function getLinks(books, page, limit, filter, sort, author, genre) {
  const lastPage = Math.ceil(books.length / limit);
  const links = {
    self: buildLink(page, limit, filter, sort, author, genre),
    first: buildLink(1, limit, filter, sort, author, genre),
    last: buildLink(lastPage, limit, filter, sort, author, genre),
    next: page < lastPage ? buildLink(page + 1, limit, filter, sort, author, genre) : null,
    prev: page > 1 ? buildLink(page - 1, limit, filter, sort, author, genre) : null,
  };
  return links;
}

module.exports = function (app) {
  const express = require('express');
  const bookRouter = express.Router();
  app.set('json spaces', 0);
  app.set('env', 'production');

  bookRouter.get('/', function (req, res) {
    const { sort, filter, author, genre } = req.query;
    let { page, limit } = req.query;
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || DEFAULT_LIMIT;
    let books = BOOKS;

    if (author) {
      books = books.filter((book) => {
        return book.attributes.author === author;
      });
    }

    if (genre) {
      books = books.filter((book) => {
        return book.attributes.genre === genre;
      });
    }

    if (filter) {
      books = books.filter((book) => {
        return book.attributes.title.toLowerCase().indexOf(filter.toLowerCase()) > -1;
      });
    }

    if (sort) {
      if (!filter && !author && !genre) {
        books = books.slice();
      }
      const fields = sort.split(',').map((field) => field.split(':'));

      books.sort((a, b) => {
        for (const [field, order] of fields) {
          const valA = field === 'publicationDate' ? new Date(a.attributes[field]).getTime() : a.attributes[field];
          const valB = field === 'publicationDate' ? new Date(b.attributes[field]).getTime() : b.attributes[field];
          if (valA === valB) {
            continue;
          }
          if (order === 'asc') {
            return valA > valB ? 1 : -1;
          } else {
            return valA < valB ? 1 : -1;
          }
        }
      });
    }

    const data = getPage(books, page, limit);
    const links = getLinks(books, page, limit, filter, sort, author, genre);
    const meta = getMeta(books, page, limit);

    res.json({
      links,
      meta,
      data,
    });
  });

  bookRouter.get('/genres', function (req, res) {
    res.send({
      data: CATEGORIES,
    });
  });

  bookRouter.get('/authors', function (req, res) {
    res.send({
      data: AUTHORS,
    });
  });

  app.use('/api/books', bookRouter);
};
