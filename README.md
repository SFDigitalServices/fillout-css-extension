# Fillout CSS extension

A Chrome extension (Manifest V3) that hot-swaps the custom CSS of Fillout forms
with a stylesheet from one of three sources, so you can test CSS without editing
the Fillout theme. It runs in every frame on `digital.forms.sf.gov` and
`forms.fillout.com`, including forms embedded on sf.gov in an iframe.

## Install

### Download

Zip archives of the extension are built in both pull requests and on every merge
to the `main` branch by GitHub Actions (specifically, in
[.github/workflows/ci.yml](./.github/workflows/ci.yml)). To find the build:

- Navigate to a successful run in the [Actions
tab](https://github.com/SFDigitalServices/fillout-css-extension/actions) on GitHub
- Click on the "ci" job
- Expand the "Run actions/upload-artifact" step
- Click the URL after "Artifact download URL:" to download the zip archive
- Unzip it by opening in the Finder (it should be called
  `chrome-fillout-css.zip` in your `Downloads` folder)

### Enable

- Visit [chrome://extensions] in Chrome
- Enable **Developer mode**
- Click **Load unpacked**
- Select the extension directory in the prompt

### Develop

Working on the extension requires installing Node, npm dependencies, then
running the `build` or `watch` scripts. To build once:

```sh
npm install
npm run build
```

Then [enable the extension](#enable), but select the `dist` directory in this
repo instead of the unzipped archive.

You can run `npm run watch` to automatically build the extension whenever source files change, but keep in mind that:

> [!INFO]
> Every time you build the extension, you will need to click the reload button
> (<kbd>↻</kbd>) in the bottom right corner of the extension in
> [chrome://extensions] to see the changes. You may also need to refresh any
> open form pages because the extension context is invalidated whenever you
> install a new build.

## CSS source

Open the extension's **Options** (by right-clicking the extension icon) to
choose the **CSS source**:

- **URL**: an `https://` URL (or `http://localhost`). Saving prompts you to
  allow the extension to fetch from that host. The default is the latest version
  of the CSS from the
  [@sfgov/fillout](https://www.npmjs.com/package/@sfgov/fillout) npm package.

- **Local CSS**: an absolute path to a CSS file. Chrome only lets extensions read
  local files if you turn on **Allow access to file URLs** for this extension on
  `chrome://extensions`.

The CSS is loaded when the page loads. For **Local CSS**, tick **Live reload when
the file changes** to re-read the file about once a second and apply edits without
reloading the form. Polling pauses while the tab is hidden or the toggle is on
"default". Saving the options applies to open forms without a reload.

## Toggle

On a form, a small button in the bottom right corner shows `CSS: custom` or
`CSS: default`. Clicking it switches between your CSS and the form's original
CSS for that tab (all frames in the tab switch together). Form state is
preserved, so you can see changes to the exact state your form is in.

## How it works

The theme's `customCSS` lives in Fillout's Redux store. `content-main.ts` finds
that store through React's fiber tree and dispatches `theme/setTheme` with the
new CSS, and Fillout's own styled-components re-render it. This relies on
Fillout's internals, so the button shows `CSS: unsupported` if the store can't
be found.

[chrome://extensions]: chrome://extensions
