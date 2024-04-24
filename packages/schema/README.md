<p align="center">
  <img
    class="project-logo"
    src="./NCC-1701-a-blue.svg#gh-light-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
  <img
    class="project-logo"
    src="./NCC-1701-a.svg#gh-dark-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
</p>

<h3 align="center">:electron: Declarative Schema Parser</h3>
<p align="center">Build faster with better DX</p>

<p align="center">
    <img
      src="./parse-usage.png"
      alt="WarpDrive Schema"
      width="400px"
      title="WarpDrive Schema" />
</p>

`@warp-drive/schema` allows you to easily use the typescript you already know as a statically analyzable schema language.

Its like GraphQL, RPC, or Protobuf... but for anything!

---

## Installation

```cli
pnpm install @warp-drive/schema
```

**Tagged Releases**

- ![NPM Canary Version](https://img.shields.io/npm/v/%40warp-drive/schema/canary?label=%40canary&color=FFBF00)
- ![NPM Beta Version](https://img.shields.io/npm/v/%40warp-drive/schema/beta?label=%40beta&color=ff00ff)
- ![NPM Stable Version](https://img.shields.io/npm/v/%40warp-drive/schema/latest?label=%40latest&color=90EE90)
- ![NPM LTS Version](https://img.shields.io/npm/v/%40warp-drive/schema/lts?label=%40lts&color=0096FF)
- ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/%40warp-drive/schema/lts-4-12?label=%40lts-4-12&color=bbbbbb)

#### 🔜 Soon 

Scaffold the schema for a `User` resource

```no-highlight
npx -p @warp-drive/schema resource user
```

Parse Schemas

```no-highlight
npx -p @warp-drive/schema parse <path/to/schema.json>
```

## How it works

The parser expects a json config file.

```ts
{
  "schemas": "./src/schemas",
  "dest": "./dist",
}
```

### ♥️ Credits

 <details>
   <summary>Brought to you with ♥️ love by <a href="https://emberjs.com" title="EmberJS">🐹 Ember</a></summary>

  <style type="text/css">
    img.project-logo {
       padding: 0 5em 1em 5em;
       width: 100px;
       border-bottom: 2px solid #0969da;
       margin: 0 auto;
       display: block;
     }
    details > summary {
      font-size: 1.1rem;
      line-height: 1rem;
      margin-bottom: 1rem;
    }
    details {
      font-size: 1rem;
    }
    details > summary strong {
      display: inline-block;
      padding: .2rem 0;
      color: #000;
      border-bottom: 3px solid #0969da;
    }

    details > details {
      margin-left: 2rem;
    }
    details > details > summary {
      font-size: 1rem;
      line-height: 1rem;
      margin-bottom: 1rem;
    }
    details > details > summary strong {
      display: inline-block;
      padding: .2rem 0;
      color: #555;
      border-bottom: 2px solid #555;
    }
    details > details {
      font-size: .85rem;
    }

    @media (prefers-color-scheme: dark) {
      details > summary strong {
        color: #fff;
      }
    }
    @media (prefers-color-scheme: dark) {
      details > details > summary strong {
        color: #afaba0;
      border-bottom: 2px solid #afaba0;
      }
    }
  </style>
</details>
