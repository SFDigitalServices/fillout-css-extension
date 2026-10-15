import type {
  BackgroundRequest,
  CssResponse,
  StateResponse,
  TabMessage,
} from './shared/protocol'
import { loadSettings, originPattern, parseCssUrl, toFileUrl } from './shared/settings'

const tabKey = (tabId: number) => `tab:${tabId}`

chrome.runtime.onMessage.addListener((message: BackgroundRequest, sender, sendResponse) => {
  const tabId = sender.tab?.id
  switch (message.type) {
    case 'get-css':
      void fetchCss().then(sendResponse, (error: unknown) => {
        sendResponse({ error: errorMessage(error) } satisfies CssResponse)
      })
      return true
    case 'get-state':
      if (tabId === undefined) return false
      void isEnabled(tabId).then(enabled => sendResponse({ enabled } satisfies StateResponse))
      return true
    case 'toggle':
      if (tabId === undefined) return false
      void toggle(tabId).then(enabled => sendResponse({ enabled } satisfies StateResponse))
      return true
  }
  return false
})

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(tabKey(tabId))
})

async function isEnabled(tabId: number): Promise<boolean> {
  const key = tabKey(tabId)
  const stored = await chrome.storage.session.get(key)
  return (stored[key] as boolean | undefined) ?? true
}

async function toggle(tabId: number): Promise<boolean> {
  const enabled = !(await isEnabled(tabId))
  await chrome.storage.session.set({ [tabKey(tabId)]: enabled })
  // no frameId: every frame in the tab hears it
  await chrome.tabs.sendMessage(tabId, { type: 'enabled', enabled } satisfies TabMessage)
    .catch((): void => undefined)
  return enabled
}

async function fetchCss(): Promise<CssResponse> {
  const settings = await loadSettings()
  let url: string

  switch (settings.source) {
    case 'bundled':
      url = chrome.runtime.getURL('theme-sfgov.css')
      break
    case 'local':
      if (!(await chrome.extension.isAllowedFileSchemeAccess())) {
        throw new Error('Enable "Allow access to file URLs" for this extension in chrome://extensions')
      }
      url = toFileUrl(settings.localPath)
      break
    case 'url': {
      const parsed = parseCssUrl(settings.url)
      const origins = [originPattern(parsed)]
      if (!(await chrome.permissions.contains({ origins }))) {
        throw new Error(`Grant access to ${origins[0]} by saving the URL in the extension options`)
      }
      url = parsed.href
      break
    }
  }

  const response = await fetch(url, { cache: 'no-store' }).catch(() => {
    throw new Error(`Could not load ${url}`)
  })
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`)
  }
  return { css: await response.text() }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
