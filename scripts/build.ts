#!/usr/bin/env -S npx tsx
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { BuildInfo } from '../src/shared/build-info'

const REPO_DIR = join(__dirname, '..')
const DIST_DIR = join(REPO_DIR, 'dist')
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
    await readFile(join(REPO_DIR, 'package.json'), 'utf8'),
  ) as { version: string }
  const info = getBuildInfo(pkg.version)

  await rm(DIST_DIR, { recursive: true, force: true })
  await mkdir(DIST_DIR, { recursive: true })

  await build({
    entryPoints: ENTRY_POINTS.map(name => join('src', `${name}.ts`)),
    outdir: DIST_DIR,
    bundle: true,
    format: 'iife',
    target: 'chrome111',
    logLevel: 'info',
  })

  await copyFile(join(REPO_DIR, 'src/options.html'), join(DIST_DIR, 'options.html'))
  await cp(join(REPO_DIR, 'icons'), join(DIST_DIR, 'icons'), { recursive: true })
  await writeFile(join(DIST_DIR, 'build-info.json'), JSON.stringify(info, null, 2))

  const manifest = JSON.parse(
    await readFile(join(REPO_DIR, 'manifest.template.json'), 'utf8'),
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
  const sha = process.env.GITHUB_SHA || git('rev-parse', 'HEAD')
  const dirty = git('status', '--porcelain') !== ''
  return { version, sha, repo: REPO, dirty }
}

function git(...args: string[]) {
  return execFileSync('git', args, { cwd: REPO_DIR, encoding: 'utf8' }).trim()
}
