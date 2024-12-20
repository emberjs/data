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

<h3 align="center">⚡️ Simple, Fast HTTP Mocking</h3>
<p align="center">Ideal for Test Suites</p>

<p align="center">
    <img
      src="./pnpm-install-logo.png"
      alt="WarpDrive Holodeck"
      width="320px"
      title="WarpDrive Holodeck" />
</p>


- ⚡️ Real network requests
  - brotli compression
  - http/2
  - no CORS preflight requests
- 💜 Unparalleled DX
  - debug real network requests
  - every request is scoped to a test
  - run as many tests as desired simultaneously
- 🔥 Blazing Fast Tests
  - record your tests when you change them
  - replays from cache until you change them again
  - the cache is managed by git, so changing branches works seamlessly as does skipping unneeded work in CI or while rebasing
  - zero-work: setup work is skipped when in replay mode

<br>

## Documentation

- [Motivations](./docs/motivations.md)
- [Server Setup](./docs/server-setup.md)
- [Client Setup](./docs/request-integration.md)
- [Test Framework Integration](./docs/test-framework-integration.md)
- [HoloPrograms](./docs/holo-programs.md)
  - [Route Handlers](./docs/holo-programs.md#1-shared-route-handlers)
  - [Seed Data](./docs/holo-programs.md#2-seed-data)
  - [Behaviors](./docs/holo-programs.md#3-holoprogram-specific-behaviors)
- [Safety Protocols](./docs/holo-programs.md#safety-protocols)
- [VCR Style Tests](./docs/vcr-style.md)

<br>

---

<br>

## Installation

```json
pnpm install @warp-drive/holodeck
```

**Tagged Releases**

- ![NPM Canary Version](https://img.shields.io/npm/v/%40warp-drive/holodeck/canary?label=%40canary&color=FFBF00)
- ![NPM Beta Version](https://img.shields.io/npm/v/%40warp-drive/holodeck/beta?label=%40beta&color=ff00ff)
- ![NPM Stable Version](https://img.shields.io/npm/v/%40warp-drive/holodeck/latest?label=%40latest&color=90EE90)
- ![NPM LTS Version](https://img.shields.io/npm/v/%40warp-drive/holodeck/lts?label=%40lts&color=0096FF)
- ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/%40warp-drive/holodeck/lts-4-12?label=%40lts-4-12&color=bbbbbb)

<br>
<br>
<br>

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
