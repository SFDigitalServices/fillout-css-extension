import { cssTreeUrl, type BuildInfo } from './shared/build-info'
import {
  loadSettings,
  originPattern,
  parseCssUrl,
  saveSettings,
  toFileUrl,
  type CssSource,
} from './shared/settings'

const form = byId<HTMLFormElement>('form')
const localPath = byId<HTMLInputElement>('local-path')
const cssUrl = byId<HTMLInputElement>('css-url')
const liveReload = byId<HTMLInputElement>('live-reload')
const liveReloadOption = byId('live-reload-option')
const statusEl = byId('status')
const fileWarning = byId('file-warning')
const radios = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="source"]'))

void init()

async function init() {
  const settings = await loadSettings()
  localPath.value = settings.localPath
  cssUrl.value = settings.url
  liveReload.checked = settings.liveReload
  selectedRadio(settings.source).checked = true
  syncInputs()
  radios.forEach(radio => radio.addEventListener('change', syncInputs))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    void save()
  })

  fileWarning.hidden = await chrome.extension.isAllowedFileSchemeAccess()
  await renderBundledLabel()
}

async function renderBundledLabel() {
  const response = await fetch(chrome.runtime.getURL('build-info.json'))
  const info = await response.json() as BuildInfo
  const link = document.createElement('a')
  link.href = cssTreeUrl(info)
  link.target = '_blank'
  link.rel = 'noopener'
  link.textContent = info.sha.slice(0, 7)
  byId('bundled-label').replaceChildren(
    `Bundled CSS (version ${info.version} at `,
    link,
    info.dirty ? ', with local changes)' : ')',
  )
}

function syncInputs() {
  const source = currentSource()
  localPath.disabled = source !== 'local'
  cssUrl.disabled = source !== 'url'
  liveReloadOption.hidden = source !== 'local'
}

async function save() {
  const source = currentSource()
  try {
    // the permission prompt needs the user gesture, so nothing async comes before it
    if (source === 'local') {
      toFileUrl(localPath.value)
    }
    else if (source === 'url') {
      const granted = await chrome.permissions.request({
        origins: [originPattern(parseCssUrl(cssUrl.value))],
      })
      if (!granted) throw new Error('Permission to fetch that URL was denied')
    }
    await saveSettings({
      source,
      localPath: localPath.value.trim(),
      url: cssUrl.value.trim(),
      liveReload: liveReload.checked,
    })
    showStatus('Saved.')
  }
  catch (error) {
    showStatus(error instanceof Error ? error.message : String(error), true)
  }
}

function showStatus(message: string, isError = false) {
  statusEl.textContent = message
  statusEl.classList.toggle('error', isError)
}

function currentSource(): CssSource {
  return (radios.find(radio => radio.checked)?.value ?? 'bundled') as CssSource
}

function selectedRadio(source: CssSource) {
  return radios.find(radio => radio.value === source) ?? radios[0]
}

function byId<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T
}
