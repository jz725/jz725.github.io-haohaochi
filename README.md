# Hao Hao Chi — demo build

A standalone, static version of the Hao Hao Chi site. **No server, no install.**
Double-click `index.html` and it runs.

> This is the demo copy. The full version — with the Node server and the admin
> console for managing the menu — lives in the parent folder.

## Opening it

Double-click `index.html`, or drag it into a browser. That's it.

It also works unchanged on any static host (GitHub Pages, Netlify, a shared
folder) because every path in it is relative.

## What's different from the full version

| | Full version | This demo |
| --- | --- | --- |
| Menu source | `GET /api/menu` from the Node server | `menu-data.js`, baked in |
| Admin console | Yes, login + full menu management | Removed |
| Needs Node to view | Yes (`node server.js`) | No |

Everything a visitor sees is identical: the same pages, cart, search, category
filters, sold-out handling and opening-hours logic.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Landing page — hero slideshow, guest favourites, story teaser |
| `menu.html` | Full menu with search and category filters |
| `about.html` | The restaurant's story and mission |
| `contact.html` | Address, live open/closed status, hours, message form |

## Editing the menu

`data/menu.json` is the source of truth. After changing it, regenerate the
baked copy:

```bash
node build-menu.js
```

That rewrites `menu-data.js`, which is what the pages actually read. Node is
only needed for this one build step — never to view the site.

Each dish looks like this:

```json
{
  "id": "mapo-tofu",
  "name": "Mapo Tofu",
  "price": 11,
  "description": "Delicately soft tofu under a tongue-numbing bean sauce…",
  "category": "entrees",
  "image": "./images/220510_Mapo-Tofu_550.jpg",
  "soldOut": false,
  "featured": true,
  "tag": "Most loved",
  "order": 0
}
```

- `category` must match a category `id` in the same file.
- `featured` puts it in the "guest favourites" row on the homepage (first three win).
- `soldOut` greys it out on the menu and removes its Add button.
- `order` sets its position within its category.

If you'd rather not run the build step, you can edit `menu-data.js` directly —
just keep `data/menu.json` in sync so the two don't drift.

## Files

```
index/menu/about/contact.html  The four pages (index.html is the landing page)
web.css                        Design tokens and all styles
web.js                         Cart, nav, menu rendering, opening hours
menu-data.js                   GENERATED — the menu, baked in
build-menu.js                  Regenerates menu-data.js from data/menu.json
data/menu.json                 Source of truth for the menu
images/                        Dish photos (images/uploads/ came from the admin console)
```

## Known limitations

- Checkout and the contact form are demos — nothing is charged, no email is sent.
- The cart is saved in the browser's local storage. Opened via `file://` some
  browsers restrict this, in which case the cart simply won't survive a reload —
  everything else still works.
- The social links in the footer are placeholders.
- Several photos in `images/` are very large (one is 16MB); resizing them would
  make the demo noticeably faster to load.
