import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = join(root, 'custom-pages')
const targetDir = join(root, 'public', 'custom-pages')
const manifestPath = join(targetDir, 'manifest.json')

mkdirSync(targetDir, { recursive: true })

for (const entry of readdirSync(targetDir, { withFileTypes: true })) {
  if (entry.name === 'manifest.json') continue
  rmSync(join(targetDir, entry.name), { recursive: true, force: true })
}

const pages = []

if (existsSync(sourceDir)) {
  cpSync(sourceDir, targetDir, { recursive: true, force: true })
  discoverHtml(sourceDir)
}

writeFileSync(manifestPath, `${JSON.stringify({ generatedAt: '', pages }, null, 2)}\n`)

function discoverHtml(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      discoverHtml(path)
      continue
    }
    if (!entry.name.endsWith('.html')) continue

    const rel = relative(sourceDir, path).replaceAll('\\', '/')
    const metadata = readMetadata(path)
    pages.push({
      id: rel.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''),
      title: metadata.title || readHtmlTitle(path) || basename(entry.name, '.html'),
      href: `/custom-pages/${rel}`,
      description: metadata.description || '',
    })
  }
}

function readMetadata(htmlPath) {
  const jsonPath = join(dirname(htmlPath), 'page.json')
  if (!existsSync(jsonPath)) return {}
  try {
    const parsed = JSON.parse(readFileSync(jsonPath, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function readHtmlTitle(htmlPath) {
  const html = readFileSync(htmlPath, 'utf8')
  return html.match(/<title>(.*?)<\/title>/i)?.[1]?.trim() ?? ''
}
