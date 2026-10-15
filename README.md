# SF.gov Fillout CSS extension

A Chrome extension (Manifest V3) that hot-swaps the custom CSS of SF.gov Fillout
forms with a stylesheet from one of three sources, so you can test CSS without
editing the Fillout theme. It runs in every frame on `digital.forms.sf.gov` and
`forms.fillout.com`, including forms embedded on sf.gov in an iframe.

## Install

```sh
npm install
npm run build -w @sfgov/fillout
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**,
and select `fillout/extension/dist`. Rebuild and click reload on the extension to
pick up changes to the bundled CSS (`fillout/theme-sfgov.css`) or the code.

## CSS source

Open the extension's **Options** to choose the **CSS source**:

- **Bundled CSS**: the `theme-sfgov.css` copied into the extension at build time.
  The label links to the commit that last changed it. This is the default.
- **Local CSS**: an absolute path to a CSS file. Chrome only lets extensions read
  local files if you turn on **Allow access to file URLs** for this extension on
  `chrome://extensions`.
- **URL**: an `https://` URL (or `http://localhost`). Saving prompts you to allow
  the extension to fetch from that host.

The CSS is loaded when the page loads; reload the form to pick up changes.

## Toggle

On a form, a small button in the bottom right corner shows `SF CSS: custom` or
`SF CSS: default`. Clicking it switches between your CSS and the form's original
CSS for that tab (all frames in the tab switch together). Form state is kept.

## How it works

The theme's `customCSS` lives in Fillout's Redux store. `content-main.ts` finds
that store through React's fiber tree and dispatches `theme/setTheme` with the
new CSS, and Fillout's own styled-components re-render it. This relies on
Fillout's internals, so the button shows `SF CSS: unsupported` if the store can't
be found.
