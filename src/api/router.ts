import { handleAuth, requireSession } from './auth'
import {
  createNote,
  createPage,
  createPageLink,
  createShoppingItem,
  createShoppingList,
  deleteNote,
  deletePage,
  deletePageLink,
  deleteShoppingItem,
  deleteShoppingList,
  getDashboard,
  getMarine,
  getPage,
  getSettings,
  getWeather,
  listNotes,
  listPageLinks,
  listPages,
  listShoppingLists,
  updateNote,
  updatePage,
  updateSettings,
  updateShoppingItem,
  updateShoppingList,
} from './data'
import { ApiError, json, methodNotAllowed, notFound, readJson } from './http'
import { listModules, updateModules } from './modules'
import type { ApiContext } from './types'

export async function handleApi(context: ApiContext): Promise<Response> {
  try {
    const url = new URL(context.request.url)
    const path = url.pathname.replace(/^\/api\/?/, '')
    const parts = path.split('/').filter(Boolean)
    const resource = parts[0] || 'home'

    if (resource === 'auth') return await handleAuth(context, parts.slice(1))

    await requireSession(context.request, context.env)

    if (resource === 'home' && context.request.method === 'GET') return json(await getDashboard(context.env, context.request))
    if (resource === 'modules') return await routeModules(context, parts.slice(1))
    if (resource === 'weather' && context.request.method === 'GET') return json(await getWeather(context.env))
    if ((resource === 'tides' || resource === 'marine') && context.request.method === 'GET') return json(await getMarine(context.env))
    if (resource === 'notes') return await routeNotes(context, parts.slice(1), url)
    if (resource === 'lists') return await routeLists(context, parts.slice(1))
    if (resource === 'items') return await routeItems(context, parts.slice(1))
    if (resource === 'pages') return await routePages(context, parts.slice(1))
    if (resource === 'page-links') return await routePageLinks(context, parts.slice(1))
    if (resource === 'settings') return await routeSettings(context)

    return notFound()
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, { status: error.status })
    console.error(error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function routeModules(context: ApiContext, parts: string[]) {
  if (parts.length > 0) return notFound()
  if (context.request.method === 'GET') return json(await listModules(context.env))
  if (context.request.method === 'PATCH') return json(await updateModules(context.env, await readJson(context.request)))
  return methodNotAllowed()
}

async function routeNotes(context: ApiContext, parts: string[], url: URL) {
  if (parts.length === 0) {
    if (context.request.method === 'GET') return json(await listNotes(context.env, { q: url.searchParams.get('q') ?? undefined, tag: url.searchParams.get('tag') ?? undefined }))
    if (context.request.method === 'POST') return json(await createNote(context.env, await readJson(context.request)), { status: 201 })
    return methodNotAllowed()
  }

  const noteId = parts[0]
  if (context.request.method === 'PATCH') {
    const note = await updateNote(context.env, noteId, await readJson(context.request))
    return note ? json(note) : json({ error: 'Note not found' }, { status: 404 })
  }
  if (context.request.method === 'DELETE') {
    await deleteNote(context.env, noteId)
    return new Response(null, { status: 204 })
  }
  return methodNotAllowed()
}

async function routeLists(context: ApiContext, parts: string[]) {
  if (parts.length === 0) {
    if (context.request.method === 'GET') return json(await listShoppingLists(context.env))
    if (context.request.method === 'POST') {
      const body = await readJson<{ name?: string }>(context.request)
      return json(await createShoppingList(context.env, String(body.name ?? '')), { status: 201 })
    }
    return methodNotAllowed()
  }

  const listId = parts[0]
  if (parts[1] === 'items' && context.request.method === 'POST') {
    const body = await readJson<{ text?: string }>(context.request)
    const item = await createShoppingItem(context.env, listId, String(body.text ?? ''))
    return item ? json(item, { status: 201 }) : json({ error: 'List not found' }, { status: 404 })
  }

  if (context.request.method === 'PATCH') {
    const body = await readJson<{ name?: string }>(context.request)
    const list = await updateShoppingList(context.env, listId, String(body.name ?? ''))
    return list ? json(list) : json({ error: 'List not found' }, { status: 404 })
  }

  if (context.request.method === 'DELETE') {
    await deleteShoppingList(context.env, listId)
    return new Response(null, { status: 204 })
  }

  return methodNotAllowed()
}

async function routeItems(context: ApiContext, parts: string[]) {
  const itemId = parts[0]
  if (!itemId) return notFound()

  if (context.request.method === 'PATCH') {
    const item = await updateShoppingItem(context.env, itemId, await readJson(context.request))
    return item ? json(item) : json({ error: 'Item not found' }, { status: 404 })
  }

  if (context.request.method === 'DELETE') {
    await deleteShoppingItem(context.env, itemId)
    return new Response(null, { status: 204 })
  }

  return methodNotAllowed()
}

async function routePages(context: ApiContext, parts: string[]) {
  if (parts.length === 0) {
    if (context.request.method === 'GET') return json(await listPages(context.env))
    if (context.request.method === 'POST') return json(await createPage(context.env, await readJson(context.request)), { status: 201 })
    return methodNotAllowed()
  }

  const pageId = parts[0]
  if (context.request.method === 'GET') {
    const page = await getPage(context.env, pageId)
    return page ? json(page) : notFound()
  }
  if (context.request.method === 'PATCH') {
    const page = await updatePage(context.env, pageId, await readJson(context.request))
    return page ? json(page) : json({ error: 'Page not found' }, { status: 404 })
  }
  if (context.request.method === 'DELETE') {
    await deletePage(context.env, pageId)
    return new Response(null, { status: 204 })
  }
  return methodNotAllowed()
}

async function routePageLinks(context: ApiContext, parts: string[]) {
  if (parts.length === 0) {
    if (context.request.method === 'GET') return json(await listPageLinks(context.env))
    if (context.request.method === 'POST') return json(await createPageLink(context.env, await readJson(context.request)), { status: 201 })
    return methodNotAllowed()
  }

  if (context.request.method === 'DELETE') {
    await deletePageLink(context.env, parts[0])
    return new Response(null, { status: 204 })
  }
  return methodNotAllowed()
}

async function routeSettings(context: ApiContext) {
  if (context.request.method === 'GET') return json(await getSettings(context.env))
  if (context.request.method === 'PUT') return json(await updateSettings(context.env, await readJson(context.request)))
  return methodNotAllowed()
}
