// Sync drop-in themes from the root `themes/` directory into `public/themes/` and
// generate `public/themes/manifest.json`. Mirrors sync-custom-pages.mjs: external
// developers drop a `themes/<id>/theme.json` (+ optional theme.css/assets) and a
// build/dev run discovers it. Malformed manifests are reported as warnings rather
// than failing the build.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = join(root, 'themes')
const targetDir = join(root, 'public', 'themes')
const manifestPath = join(targetDir, 'manifest.json')
const warnings = []
const themes = []

mkdirSync(targetDir, { recursive: true })

for (const entry of readdirSync(targetDir, { withFileTypes: true })) {
  if (entry.name === 'manifest.json') continue
  rmSync(join(targetDir, entry.name), { recursive: true, force: true })
}

if (existsSync(sourceDir)) {
  cpSync(sourceDir, targetDir, { recursive: true, force: true })
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    discoverTheme(entry.name)
  }
}

themes.sort((a, b) => (a.id === 'base' ? -1 : b.id === 'base' ? 1 : a.name.localeCompare(b.name)))

writeFileSync(manifestPath, `${JSON.stringify({ generatedAt: '', themes, warnings }, null, 2)}\n`)

function discoverTheme(folder) {
  const themeJsonPath = join(sourceDir, folder, 'theme.json')
  if (!existsSync(themeJsonPath)) {
    warnings.push({ path: `themes/${folder}`, message: 'Theme folder has no theme.json.' })
    return
  }
  let parsed
  try {
    parsed = JSON.parse(readFileSync(themeJsonPath, 'utf8'))
  } catch {
    warnings.push({ path: `themes/${folder}/theme.json`, message: 'theme.json is not valid JSON.' })
    return
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.id || !parsed.name) {
    warnings.push({ path: `themes/${folder}/theme.json`, message: 'theme.json is missing an id or name.' })
    return
  }
  if (parsed.id !== folder) {
    warnings.push({ path: `themes/${folder}/theme.json`, message: `theme id "${parsed.id}" does not match folder name "${folder}".` })
  }
  themes.push({
    id: String(parsed.id),
    name: String(parsed.name),
    author: String(parsed.author ?? 'Unknown'),
    version: String(parsed.version ?? '0.0.0'),
  })
}
