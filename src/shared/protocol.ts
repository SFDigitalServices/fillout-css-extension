/** Messages from content scripts to the background service worker. */
export type BackgroundRequest
  = | { type: 'get-css' }
    | { type: 'get-state' }
    | { type: 'toggle' }

export type CssResponse = { css: string } | { error: string }

export type StateResponse = { enabled: boolean }

/** Broadcast by the background to every frame in a tab. */
export type TabMessage = { type: 'enabled', enabled: boolean }

/**
 * DOM events shared by the MAIN and ISOLATED content scripts. Details are JSON
 * strings because structured objects don't reliably cross worlds.
 */
export const EVENTS = {
  /** MAIN -> ISOLATED: MAIN script is listening, send the config */
  hello: 'sfgov-fillout:hello',
  /** ISOLATED -> MAIN: detail is a JSON-encoded {@link Config} */
  config: 'sfgov-fillout:config',
  /** MAIN -> ISOLATED: detail is a {@link MainStatus} */
  status: 'sfgov-fillout:status',
} as const

export type Config = {
  /** null if the CSS could not be loaded */
  css: string | null
  enabled: boolean
}

export type MainStatus = 'ready' | 'unsupported'
