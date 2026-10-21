export type BuildInfo = {
  version: string
  sha: string
  repo: string
  dirty: boolean
}

export function buildUrl({ repo, sha }: BuildInfo) {
  return `https://github.com/${repo}/tree/${sha}`
}
