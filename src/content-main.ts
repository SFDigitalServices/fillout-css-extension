/**
 * Runs in the page's JS world. Finds Fillout's Redux store through React's
 * fiber tree and swaps the theme's `customCSS`; Fillout's own styled-components
 * then re-render with the new CSS, preserving all form state.
 */
import { EVENTS, type Config, type MainStatus } from './shared/protocol'

type Fiber = {
  child?: Fiber | null
  sibling?: Fiber | null
  memoizedProps?: { store?: unknown } | null
}

type ThemeTemplate = { customCSS?: string }

type Store = {
  getState(): { theme?: { theme?: ThemeTemplate } }
  dispatch(action: unknown): unknown
  subscribe(listener: () => void): () => void
}

const POLL_INTERVAL_MS = 50
const GIVE_UP_AFTER_MS = 30_000

let store: Store | undefined
let config: Config | undefined
let originalCss: string | undefined

document.addEventListener(EVENTS.config, (event) => {
  config = JSON.parse((event as CustomEvent<string>).detail) as Config
  reconcile()
})

const startedAt = Date.now()
const timer = setInterval(() => {
  store = findStore()
  if (store) {
    clearInterval(timer)
    store.subscribe(reconcile)
    reportStatus('ready')
    reconcile()
  }
  else if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
    clearInterval(timer)
    if (document.getElementById('__next')) {
      console.error('[sfgov-fillout] could not find the Fillout Redux store; this Fillout build may be unsupported')
      reportStatus('unsupported')
    }
  }
}, POLL_INTERVAL_MS)

document.dispatchEvent(new CustomEvent(EVENTS.hello))

/** Idempotent, so it's safe to run on every store update. */
function reconcile() {
  if (!store || !config) return
  const theme = store.getState().theme?.theme
  if (!theme) return

  originalCss ??= theme.customCSS ?? ''
  const desired = config.enabled && config.css !== null ? config.css : originalCss
  if ((theme.customCSS ?? '') !== desired) {
    store.dispatch({
      type: 'theme/setTheme',
      payload: { theme: { ...theme, customCSS: desired } },
    })
  }
}

function reportStatus(status: MainStatus) {
  document.dispatchEvent(new CustomEvent(EVENTS.status, { detail: status }))
}

function findStore(): Store | undefined {
  const root = document.getElementById('__next')
  if (!root) return undefined
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'))
  if (!key) return undefined

  const seen = new Set<Fiber>()
  const stack: Array<Fiber | null | undefined> = [(root as unknown as Record<string, Fiber>)[key]]
  while (stack.length) {
    const fiber = stack.pop()
    if (!fiber || seen.has(fiber)) continue
    seen.add(fiber)
    const candidate = fiber.memoizedProps?.store
    if (isThemeStore(candidate)) return candidate
    stack.push(fiber.child, fiber.sibling)
  }
  return undefined
}

function isThemeStore(value: unknown): value is Store {
  const candidate = value as Partial<Store> | null | undefined
  return typeof candidate?.getState === 'function'
    && typeof candidate.dispatch === 'function'
    && typeof candidate.subscribe === 'function'
    && 'theme' in candidate.getState()
}
