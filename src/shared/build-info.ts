export type BuildInfo = {
  version: string
  /** last commit that touched the bundled CSS */
  sha: string
  /** repo-relative path to the bundled CSS */
  cssPath: string
  repo: string
  /** bundled CSS had uncommitted changes at build time */
  dirty: boolean
}

export function cssTreeUrl({ repo, sha, cssPath }: BuildInfo) {
  return `https://github.com/${repo}/tree/${sha}/${cssPath}`
}
