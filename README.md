# samwitte.com/pcb

The freelance PCB design page at [samwitte.com/pcb](https://samwitte.com/pcb/), plus the
Cloudflare Worker behind its "Request a quote" form.

This is the `dev/pcb-single-page` branch of `samcwitte/samcwitte.github.io`, checked out
as a worktree next to the main site. It publishes to the `gh-pages` branch of the separate
[`samcwitte/pcb`](https://github.com/samcwitte/pcb) repo (the `pcb` remote), which GitHub
Pages serves under the main site's domain at `/pcb/`.

## Layout

```
src/
├── index.html      the page
├── home.css        styles (theme tokens match the main site's site.css)
├── stack.js        the exploded layer-stack board and LED hover effect
├── quote.js        the quote form dialog; posts to the Worker
└── public/         favicon and the board images in matrix/
worker/             Cloudflare Worker for the quote form (see worker/README.md)
```

## Commands

```sh
yarn install
yarn start           # dev server at http://localhost:1234
yarn build           # minified build into dist/ (Parcel 2)
yarn push-gh-pages   # publish dist/ to the pcb repo's gh-pages
```

## Publishing

`push-dir` refuses to run with uncommitted changes, so commit first. Then:

```sh
yarn build
yarn push-gh-pages
git push origin dev/pcb-single-page
git push pcb dev/pcb-single-page:main   # keep the pcb repo's main in sync
```

GitHub Pages usually updates within a minute or two. Then check that
[samwitte.com/pcb](https://samwitte.com/pcb/) loads and the board animation explodes.

## Notes

- Parcel 2 refuses relative `url()`s inside CSS custom properties, so `home.css` sets
  each layer's `mask-image` directly.
- The nav links are absolute (`https://samwitte.com/...`) because the page lives under
  `/pcb/`.
