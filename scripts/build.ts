#!/usr/bin/env -S npx tsx
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { BuildInfo } from '../src/shared/build-info'

const EXTENSION_DIR = join(__dirname, '..')
const FILLOUT_DIR = join(EXTENSION_DIR, '..')
const REPO_DIR = join(FILLOUT_DIR, '..')
const DIST_DIR = join(EXTENSION_DIR, 'dist')
const CSS_FILE = join(FILLOUT_DIR, 'theme-sfgov.css')
const REPO = 'SFDigitalServices/forms'

const ENTRY_POINTS = [
  'background',
  'content-main',
  'content-isolated',
  'options',
]

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})

async function main() {
  const pkg = JSON.parse(
    await readFile(join(FILLOUT_DIR, 'package.json'), 'utf8'),
  ) as { version: string }
  const info = getBuildInfo(pkg.version)

  await rm(DIST_DIR, { recursive: true, force: true })
  await mkdir(DIST_DIR, { recursive: true })

  await build({
    entryPoints: ENTRY_POINTS.map(name => join(EXTENSION_DIR, 'src', `${name}.ts`)),
    outdir: DIST_DIR,
    bundle: true,
    format: 'iife',
    target: 'chrome111',
    logLevel: 'info',
  })

  await copyFile(join(EXTENSION_DIR, 'src/options.html'), join(DIST_DIR, 'options.html'))
  await copyFile(CSS_FILE, join(DIST_DIR, 'theme-sfgov.css'))
  await writeFile(join(DIST_DIR, 'build-info.json'), JSON.stringify(info, null, 2))

  const manifest = JSON.parse(
    await readFile(join(EXTENSION_DIR, 'manifest.template.json'), 'utf8'),
  ) as Record<string, unknown>
  await writeFile(
    join(DIST_DIR, 'manifest.json'),
    JSON.stringify({
      ...manifest,
      version: info.version,
      version_name: `${info.version}+${info.sha.slice(0, 7)}${info.dirty ? '-dirty' : ''}`,
    }, null, 2),
  )

  console.log('built %s', relative(process.cwd(), DIST_DIR))
}

function getBuildInfo(version: string): BuildInfo {
  const cssPath = relative(REPO_DIR, CSS_FILE)
  const sha = git('log', '-1', '--format=%H', '--', cssPath)
    || process.env.GITHUB_SHA
    || git('rev-parse', 'HEAD')
  const dirty = git('status', '--porcelain', '--', cssPath) !== ''
  return { version, sha, cssPath, repo: REPO, dirty }
}

function git(...args: string[]) {
  return execFileSync('git', args, { cwd: REPO_DIR, encoding: 'utf8' }).trim()
}
