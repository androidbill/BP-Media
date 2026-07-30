# BP-Media

A personal link launcher, installable as a PWA. You add the sites; it shows them
as a grid of tiles you can tap to open.

## What it does

- Add any site by typing an address (`example.com` works — no need for `https://`)
- Paste a copied link: the 📋 button, the **Paste** button in the add form, or the
  prompt that appears when you switch back to the app with a link on the clipboard
- Each tile gets an icon: the site's own favicon, or a coloured letter tile
- Rename, reorder, and remove links from the pencil button on any tile
- Search appears once you have more than eight links
- Export / import your list as JSON for backup or moving to another device
- Works offline; the app shell is cached by a service worker
- Share sheet target — share a URL from your browser straight into the app

Links are stored in `localStorage` on the device. Nothing is uploaded anywhere.

If "Site icons" is on (the default), the app requests each site's favicon from
DuckDuckGo's icon service, which means that service sees the domains on your
list. Turn it off in the ⋮ menu to use letter tiles only, fully offline.

## Running it

It's plain HTML/CSS/JS with no build step. Serve the folder over HTTP:

```bash
npx serve .
```

A service worker needs `https://` or `localhost` — opening `index.html` as a
`file://` path will work for the UI but skip offline support and install.

## Releasing

`APP_VERSION` appears in two files and both must be bumped together, or
installed copies will never see the update:

- `app.js` — drives the footer and the About sheet
- `sw.js` — names the cache, which is what actually triggers the update prompt

Format is `YYYY.MM.DD.NN`.
