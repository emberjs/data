# Request Guide | Overview

- Previous ← Intro: [What Is a Request?](./0-intro.md)
- Next → [?](./2-.md)
- ⮐ [Requests Guide](../index.md)

---

## Request Management

A `RequestManager` receives a request and manages fulfillment via configured handlers. It may be used standalone from the rest of *Ember***Data** and is not specific to any library or framework.

```mermaid
flowchart LR
    A[fa:fa-terminal App] <--> B{{fa:fa-sitemap RequestManager}}
    B <--> C[(fa:fa-database Source)]
```

Each handler may choose to fulfill the request using some source of data or to pass the request along to other handlers.

```mermaid
flowchart LR
    A[fa:fa-terminal App] <--> B{{fa:fa-sitemap RequestManager}}
    B <--> C(handler)
    C <--> E(handler)
    E <--> F(handler)
    C <--> D[(fa:fa-database Source)]
    E <--> G[(fa:fa-database Source)]
    F <--> H[(fa:fa-database Source)]
```

The same or a separate instance of a `RequestManager` may also be used to fulfill requests issued by [*Ember***Data**{Store}](https://github.com/emberjs/data/tree/main/packages/store)

```mermaid
flowchart LR
    A[fa:fa-terminal App] <--> D{fa:fa-code-fork Store}
    B{{fa:fa-sitemap RequestManager}} <--> C[(fa:fa-database Source)]
    D <--> E[(fa:fa-archive Cache)]
    D <--> B
    click D href "https://github.com/emberjs/data/tree/main/packages/store" "Go to @ember-data/store" _blank
    click E href "https://github.com/emberjs/data/tree/main/packages/json-api" "Go to @ember-data/json-api" _blank
    style D color:#58a6ff;
    style E color:#58a6ff;
```

When the same instance is used by both this allows for simple coordination throughout the application. Requests issued by the Store will use the in-memory cache
and return hydrated responses, requests issued directly to the RequestManager
will skip the in-memory cache and return raw responses.

```mermaid
flowchart LR
    A[fa:fa-terminal App] <--> B{{fa:fa-sitemap RequestManager}}
    B <--> C[(fa:fa-database Source)]
    A <--> D{fa:fa-code-fork Store}
    D <--> E[(fa:fa-archive Cache)]
    D <--> B
    click D href "https://github.com/emberjs/data/tree/main/packages/store" "Go to @ember-data/store" _blank
    click E href "https://github.com/emberjs/data/tree/main/packages/json-api" "Go to @ember-data/json-api" _blank
    style D color:#58a6ff;
    style E color:#58a6ff;
```

---

- Previous ← [One To None Relationships](./0-one-to-none.md)
- Next → [?](./2-.md)
- ⮐ [Requests Guide](../index.md)
