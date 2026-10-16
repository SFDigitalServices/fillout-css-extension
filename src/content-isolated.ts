/**
 * Runs in the extension's isolated world: loads CSS and per-tab state from the
 * background, hands them to the MAIN-world script, and shows the toggle.
 */
import {
  EVENTS,
  type BackgroundRequest,
  type Config,
  type CssResponse,
  type MainStatus,
  type StateResponse,
  type TabMessage,
} from './shared/protocol'

const POLL_INTERVAL_MS = 1000

const config: Config = { css: null, enabled: false }
let cssError: string | undefined
let status: MainStatus | undefined
let button: HTMLButtonElement | undefined
let liveReload = false
let pollTimer: ReturnType<typeof setTimeout> | undefined

document.addEventListener(EVENTS.hello, sendConfig)
document.addEventListener(EVENTS.status, (event) => {
  status = (event as CustomEvent<MainStatus>).detail
  render()
})
chrome.runtime.onMessage.addListener((message: TabMessage) => {
  if (message.type === 'enabled') {
    config.enabled = message.enabled
    sendConfig()
    render()
  }
})
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local') void refreshCss()
})

void init()

async function init() {
  const [state, css] = await Promise.all([
    send<StateResponse>({ type: 'get-state' }),
    send<CssResponse>({ type: 'get-css' }),
  ])
  config.enabled = state.enabled
  applyCss(css)
  sendConfig()
  render()
}

async function refreshCss() {
  applyCss(await send<CssResponse>({ type: 'get-css' }))
  sendConfig()
  render()
}

function applyCss(css: CssResponse) {
  if ('css' in css) {
    config.css = css.css
    cssError = undefined
    liveReload = css.liveReload
  }
  else {
    config.css = null
    cssError = css.error
    liveReload = false
    console.error('[fillout-css] %s', css.error)
  }
  schedulePoll()
}

function schedulePoll() {
  clearTimeout(pollTimer)
  if (liveReload) pollTimer = setTimeout(() => void poll(), POLL_INTERVAL_MS)
}

async function poll() {
  if (status === 'ready' && config.enabled && !document.hidden) {
    // rejects once the extension is reloaded and this script is orphaned
    const css = await send<CssResponse>({ type: 'get-css' }).catch((): undefined => undefined)
    if (!css) return
    // a failed read (e.g. mid-save) keeps the last good CSS
    if ('css' in css && css.css !== config.css) {
      config.css = css.css
      cssError = undefined
      sendConfig()
      render()
    }
  }
  schedulePoll()
}

function send<T>(message: BackgroundRequest) {
  return chrome.runtime.sendMessage<BackgroundRequest, T>(message)
}

function sendConfig() {
  document.dispatchEvent(new CustomEvent(EVENTS.config, { detail: JSON.stringify(config) }))
}

async function toggle() {
  const { enabled } = await send<StateResponse>({ type: 'toggle' })
  config.enabled = enabled
  sendConfig()
  render()
}

function render() {
  // only frames that actually host a Fillout form get an overlay
  if (!status) return
  button ??= createOverlay()

  button.classList.toggle('ready', status === 'ready')
  button.classList.toggle('unsupported', status === 'unsupported')
  button.classList.toggle('enabled', config.enabled)

  if (status === 'unsupported') {
    button.textContent = 'CSS: unsupported'
    button.title = 'Could not find the Fillout theme store; this Fillout build may have changed.'
  }
  else if (cssError) {
    button.textContent = 'CSS: error'
    button.title = `${cssError}\n\nClick to toggle; see the extension options to fix the CSS source.`
  }
  else {
    button.textContent = `CSS: ${config.enabled ? 'custom' : 'default'}`
    button.title = 'Toggle between custom and default CSS for this tab'
  }
}

function createOverlay() {
  const host = document.createElement('div')
  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = `
    :host {
      --neutral-600: #535454;
      --neutral-700: #383939;
      --neutral-800: #202121;
      --danger-600: #ac0000;
      --danger-700: #810000;
      --danger-800: #550000;
      --success-600: #026800;
      --success-700: #004a00;
      --success-800: #002c00;
    }

    button {
      position: fixed;
      right: 0;
      top: 0;
      z-index: 2147483647;
      padding: 6px 12px;
      border: 0;
      background: var(--neutral-800);
      color: #fff;
      font: 500 12px/16px system-ui, sans-serif;
      opacity: 0.8;
      cursor: pointer;
    }

    button:hover,
    button:focus-visible {
      opacity: 1;
    }

    button.unsupported {
      color: var(--danger-800);
      opacity: 0.6;
      pointer-events: none;
    }

    button.enabled:not(.unsupported) {
      background: var(--success-700);
    }
  `
  const el = document.createElement('button')
  el.type = 'button'
  el.addEventListener('click', () => void toggle())
  shadow.append(style, el)
  document.documentElement.append(host)
  return el
}
