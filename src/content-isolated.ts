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

const config: Config = { css: null, enabled: false }
let cssError: string | undefined
let status: MainStatus | undefined
let button: HTMLButtonElement | undefined

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

void init()

async function init() {
  const [state, css] = await Promise.all([
    send<StateResponse>({ type: 'get-state' }),
    send<CssResponse>({ type: 'get-css' }),
  ])
  config.enabled = state.enabled
  if ('css' in css) {
    config.css = css.css
  }
  else {
    cssError = css.error
    console.error('[sfgov-fillout] %s', css.error)
  }
  sendConfig()
  render()
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

  button.setAttribute('data-ready', String(status === 'ready'))
  button.setAttribute('data-unsupported', String(status === 'unsupported'))

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
    button {
      position: fixed;
      right: 0;
      top: 0;
      z-index: 2147483647;
      padding: 6px 12px;
      border: 0;
      background: #202121;
      color: #fff;
      font: 500 12px/16px system-ui, sans-serif;
      opacity: 0.8;
      cursor: pointer;
    }
    button:hover,
    button:focus-visible {
      opacity: 1;
    }
    button[data-supported="false"] {
      color: #f00;
    }
  `
  const el = document.createElement('button')
  el.type = 'button'
  el.addEventListener('click', () => void toggle())
  shadow.append(style, el)
  document.documentElement.append(host)
  return el
}
