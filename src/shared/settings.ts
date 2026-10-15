export type CssSource = 'bundled' | 'local' | 'url'

export type Settings = {
  source: CssSource
  localPath: string
  url: string
}

const DEFAULT_SETTINGS: Settings = {
  source: 'bundled',
  localPath: '',
  url: '',
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS as unknown as Record<string, unknown>)
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveSettings(settings: Settings) {
  await chrome.storage.local.set(settings)
}

/** Convert an absolute POSIX or Windows path into a `file://` URL. */
export function toFileUrl(path: string): string {
  const trimmed = path.trim()
  const windows = /^[A-Za-z]:[\\/]/.test(trimmed)
  if (!windows && !trimmed.startsWith('/')) {
    throw new Error('Local CSS path must be absolute (e.g. /Users/you/forms/fillout/theme-sfgov.css)')
  }
  const segments = trimmed.replace(/\\/g, '/').split('/')
  return `file://${windows ? '/' : ''}${segments.map((segment, i) =>
    windows && i === 0 ? segment : encodeURIComponent(segment),
  ).join('/')}`
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

/** Parse a remote CSS URL: https anywhere, http only for localhost. */
export function parseCssUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value.trim())
  }
  catch {
    throw new Error('Enter a full URL, e.g. https://example.com/theme.css')
  }
  const localHttp = url.protocol === 'http:' && LOCAL_HOSTS.includes(url.hostname)
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error('URL must use https (http is only allowed for localhost)')
  }
  return url
}

/** The host permission match pattern covering a URL's origin. */
export function originPattern(url: URL): string {
  return `${url.protocol}//${url.hostname}/*`
}
