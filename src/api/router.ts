import { createUser, handleAdmin, handleAuth, handleSetup, listUsers, requireAdminUnlock, requireSession, updateUser } from './auth'
import {
  createList,
  createListItem,
  createNote,
  createPage,
  createPageLink,
  clearCache,
  deleteList,
  deleteListItem,
  deleteModuleData,
  deleteNote,
  deletePage,
  deletePageLink,
  disconnectGoogle,
  getAppearance,
  getDashboard,
  getGalleryStatus,
  getGoogleConfig,
  getList,
  getListItem,
  getMarine,
  getNetworkOverview,
  getNote,
  getCustomPageManifestReport,
  getPage,
  getSettings,
  getWeather,
  listCacheEntries,
  listActivity,
  listCustomPageManifest,
  listThemeManifest,
  listLists,
  listNotes,
  listPageLinks,
  listPages,
  logActivity,
  saveGoogleConfig,
  saveGoogleTokens,
  setGalleryFolder,
  updateAppearance,
  updateList,
  updateListItem,
  updateNote,
  updatePage,
  updateSettings,
  listWhiteboardStrokes,
  createWhiteboardStroke,
  deleteWhiteboardStroke,
  clearWhiteboardStrokes,
} from './data'
import { ApiError, json, methodNotAllowed, notFound, readJson } from './http'
import { listModules, updateModules, redactModuleOptions, moduleDefinitions, type ModulePatch } from './modules'
import type { ApiContext } from './types'
import type { Session } from './auth'
import { normaliseWhiteboardStrokeInput } from '../shared/whiteboard'

export async function handleApi(context: ApiContext): Promise<Response> {
  try {
    requireTrustedOrigin(context)

    const url = new URL(context.request.url)
    const path = url.pathname.replace(/^\/api\/?/, '')
    const parts = path.split('/').filter(Boolean)
    const resource = parts[0] || 'home'

    if (resource === 'setup') return await handleSetup(context, parts.slice(1))
    if (resource === 'auth') return await handleAuth(context, parts.slice(1))
    if (resource === 'admin') return await handleAdmin(context, parts.slice(1))

    const session = await requireSession(context.request, context.env)

    if (resource === 'home' && context.request.method === 'GET') return json(await getDashboard(context.env, context.request))
    if (resource === 'modules') return await routeModules(context, parts.slice(1))
    if (resource === 'users') return await routeUsers(context, parts.slice(1))
    if (resource === 'appearance') return await routeAppearance(context)
    if (resource === 'themes') return await routeThemes(context)
    if (resource === 'activity') return await routeActivity(context)
    if (resource === 'cache') return await routeCache(context, parts.slice(1))
    if (resource === 'page-manifest') return await routePageManifest(context)
    if (resource === 'page-manifest-report') return await routePageManifestReport(context)
    if (resource === 'weather' && context.request.method === 'GET') return json(await getWeather(context.env))
    if ((resource === 'tides' || resource === 'marine') && context.request.method === 'GET') return json(await getMarine(context.env))
    if (resource === 'network' && context.request.method === 'GET') {
      return json(await getNetworkOverview(context.env))
    }
    if (resource === 'notes') return await routeNotes(context, parts.slice(1), url, session)
    if (resource === 'lists') return await routeLists(context, parts.slice(1), session)
    if (resource === 'items') return await routeItems(context, parts.slice(1), session)
    if (resource === 'pages') return await routePages(context, parts.slice(1), session)
    if (resource === 'page-links') return await routePageLinks(context, parts.slice(1), session)
    if (resource === 'whiteboard') return await routeWhiteboard(context, parts.slice(1), session)
    if (resource === 'gallery') return await routeGallery(context, parts.slice(1), session)
    if (resource === 'settings') return await routeSettings(context)

    return notFound()
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, { status: error.status })
    console.error(error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function routeUsers(context: ApiContext, parts: string[]) {
  const session = await requireAdminUnlock(context.request, context.env)
  if (parts.length === 0) {
    if (context.request.method === 'GET') return json(await listUsers(context.env))
    if (context.request.method === 'POST') {
      const user = await createUser(context.env, await readJson(context.request))
      if (user) await recordActivity(context, session, 'created', 'user', user.id, `Created user ${user.displayName}`, { role: user.role })
      return json(user, { status: 201 })
    }
    return methodNotAllowed()
  }
  if (parts.length === 1 && context.request.method === 'PATCH') {
    const body = await readJson<{ username?: string; displayName?: string; role?: string; password?: string; active?: boolean; passwordResetRequired?: boolean }>(context.request)
    const user = await updateUser(context.env, parts[0], body)
    if (user) {
      const summary = body.password && String(body.password).length > 0
        ? `Changed password for ${user.displayName}`
        : body.passwordResetRequired
          ? `Required password change for ${user.displayName}`
          : `Updated user ${user.displayName}`
      await recordActivity(context, session, 'updated', 'user', user.id, summary, {
        role: user.role,
        active: user.active,
        passwordResetRequired: user.passwordResetRequired,
      })
    }
    return user ? json(user) : json({ error: 'User not found' }, { status: 404 })
  }
  return methodNotAllowed()
}

async function routeModules(context: ApiContext, parts: string[]) {
  if (parts.length > 0) return notFound()
  const session = await requireAdminUnlock(context.request, context.env)
  if (context.request.method === 'GET') return json(await listModules(context.env))
  if (context.request.method === 'PATCH') {
    const patch = await readJson<ModulePatch[]>(context.request)
    for (const entry of patch) {
      if (entry.installed === false && (entry as ModulePatch & { deleteData?: boolean }).deleteData) await deleteModuleData(context.env, entry.id)
    }
    const modules = await updateModules(context.env, patch)
    for (const entry of patch) {
      const definition = moduleDefinitions.find((d) => d.id === entry.id)
      const metadata = entry.options ? redactModuleOptions(definition, entry.options) : {}
      await recordActivity(context, session, 'updated', 'module', entry.id, `Updated module ${entry.id}`, metadata)
    }
    return json(modules)
  }
  return methodNotAllowed()
}

async function routeAppearance(context: ApiContext) {
  if (context.request.method === 'GET') return json(await getAppearance(context.env))
  const session = await requireAdminUnlock(context.request, context.env)
  if (context.request.method === 'PUT') {
    const appearance = await updateAppearance(context.env, await readJson(context.request), context.request)
    await recordActivity(context, session, 'updated', 'appearance', 'global', 'Updated appearance settings', { ...appearance })
    return json(appearance)
  }
  return methodNotAllowed()
}

async function routeThemes(context: ApiContext) {
  if (context.request.method === 'GET') return json(await listThemeManifest(context.request))
  return methodNotAllowed()
}

async function routeCache(context: ApiContext, parts: string[]) {
  const session = await requireAdminUnlock(context.request, context.env)
  if (context.request.method === 'GET') return json(await listCacheEntries(context.env))
  if (context.request.method === 'DELETE') {
    const key = parts[0] ? decodeURIComponent(parts[0]) : undefined
    const next = await clearCache(context.env, key)
    await recordActivity(context, session, 'cleared', 'cache', key ?? 'all', key ? `Cleared cache ${key}` : 'Cleared all cache rows')
    return json(next)
  }
  return methodNotAllowed()
}

async function routeActivity(context: ApiContext) {
  await requireAdminUnlock(context.request, context.env)
  if (context.request.method === 'GET') return json(await listActivity(context.env))
  return methodNotAllowed()
}

async function routePageManifest(context: ApiContext) {
  await requireAdminUnlock(context.request, context.env)
  if (context.request.method === 'GET') return json(await listCustomPageManifest(context.request))
  return methodNotAllowed()
}

async function routePageManifestReport(context: ApiContext) {
  await requireAdminUnlock(context.request, context.env)
  if (context.request.method === 'GET') return json(await getCustomPageManifestReport(context.request))
  return methodNotAllowed()
}

async function routeNotes(context: ApiContext, parts: string[], url: URL, session: Session) {
  if (parts.length === 0) {
    if (context.request.method === 'GET') return json(await listNotes(context.env, { q: url.searchParams.get('q') ?? undefined, tag: url.searchParams.get('tag') ?? undefined }))
    if (context.request.method === 'POST') {
      const note = await createNote(context.env, await readJson(context.request), session.userId)
      if (note) await recordActivity(context, session, 'created', 'note', note.id, `Created note ${note.title}`)
      return json(note, { status: 201 })
    }
    return methodNotAllowed()
  }

  const noteId = parts[0]
  if (context.request.method === 'PATCH') {
    const note = await updateNote(context.env, noteId, await readJson(context.request), session.userId)
    if (note) await recordActivity(context, session, 'updated', 'note', note.id, `Updated note ${note.title}`)
    return note ? json(note) : json({ error: 'Note not found' }, { status: 404 })
  }
  if (context.request.method === 'DELETE') {
    const note = await getNote(context.env, noteId)
    await deleteNote(context.env, noteId)
    await recordActivity(context, session, 'deleted', 'note', noteId, `Deleted note ${note?.title ?? noteId}`)
    return new Response(null, { status: 204 })
  }
  return methodNotAllowed()
}

async function routeLists(context: ApiContext, parts: string[], session: Session) {
  if (parts.length === 0) {
    if (context.request.method === 'GET') return json(await listLists(context.env))
    if (context.request.method === 'POST') {
      const list = await createList(context.env, await readJson(context.request), session.userId)
      if (list) await recordActivity(context, session, 'created', 'list', list.id, `Created list ${list.name}`, { listType: list.listType })
      return json(list, { status: 201 })
    }
    return methodNotAllowed()
  }

  const listId = parts[0]
  if (parts[1] === 'items' && context.request.method === 'POST') {
    const body = await readJson<{ text?: string; metadata?: unknown }>(context.request)
    const item = await createListItem(context.env, listId, String(body.text ?? ''), session.userId, body.metadata)
    if (item) await recordActivity(context, session, 'created', 'list_item', item.id, `Added item to list`, { listId: item.listId })
    return item ? json(item, { status: 201 }) : json({ error: 'List not found' }, { status: 404 })
  }

  if (context.request.method === 'PATCH') {
    const list = await updateList(context.env, listId, await readJson(context.request), session.userId)
    if (list) await recordActivity(context, session, 'updated', 'list', list.id, `Updated list ${list.name}`, { listType: list.listType })
    return list ? json(list) : json({ error: 'List not found' }, { status: 404 })
  }

  if (context.request.method === 'DELETE') {
    const list = await getList(context.env, listId)
    await deleteList(context.env, listId)
    await recordActivity(context, session, 'deleted', 'list', listId, `Deleted list ${list?.name ?? listId}`)
    return new Response(null, { status: 204 })
  }

  return methodNotAllowed()
}

async function routeItems(context: ApiContext, parts: string[], session: Session) {
  const itemId = parts[0]
  if (!itemId) return notFound()

  if (context.request.method === 'PATCH') {
    const item = await updateListItem(context.env, itemId, await readJson(context.request), session.userId)
    if (item) await recordActivity(context, session, 'updated', 'list_item', item.id, item.done ? 'Completed list item' : 'Updated list item', { listId: item.listId, done: item.done })
    return item ? json(item) : json({ error: 'Item not found' }, { status: 404 })
  }

  if (context.request.method === 'DELETE') {
    const item = await getListItem(context.env, itemId)
    await deleteListItem(context.env, itemId)
    await recordActivity(context, session, 'deleted', 'list_item', itemId, 'Deleted list item', { listId: item?.listId ?? '' })
    return new Response(null, { status: 204 })
  }

  return methodNotAllowed()
}

async function routePages(context: ApiContext, parts: string[], session: Session) {
  if (parts.length === 0) {
    if (context.request.method === 'GET') return json(await listPages(context.env))
    if (context.request.method === 'POST') {
      const page = await createPage(context.env, await readJson(context.request))
      if (page) await recordActivity(context, session, 'created', 'page', page.id, `Created page ${page.title}`, { slug: page.slug })
      return json(page, { status: 201 })
    }
    return methodNotAllowed()
  }

  const pageId = parts[0]
  if (context.request.method === 'GET') {
    const page = await getPage(context.env, pageId)
    return page ? json(page) : notFound()
  }
  if (context.request.method === 'PATCH') {
    const page = await updatePage(context.env, pageId, await readJson(context.request))
    if (page) await recordActivity(context, session, 'updated', 'page', page.id, `Updated page ${page.title}`, { slug: page.slug })
    return page ? json(page) : json({ error: 'Page not found' }, { status: 404 })
  }
  if (context.request.method === 'DELETE') {
    const page = await getPage(context.env, pageId)
    await deletePage(context.env, pageId)
    await recordActivity(context, session, 'deleted', 'page', pageId, `Deleted page ${page?.title ?? pageId}`, { slug: page?.slug ?? '' })
    return new Response(null, { status: 204 })
  }
  return methodNotAllowed()
}

async function routePageLinks(context: ApiContext, parts: string[], session: Session) {
  if (parts.length === 0) {
    if (context.request.method === 'GET') return json(await listPageLinks(context.env, context.request))
    if (context.request.method === 'POST') {
      const links = await createPageLink(context.env, await readJson(context.request))
      await recordActivity(context, session, 'created', 'page_link', '', 'Created page link')
      return json(links, { status: 201 })
    }
    return methodNotAllowed()
  }

  if (context.request.method === 'DELETE') {
    await deletePageLink(context.env, parts[0])
    await recordActivity(context, session, 'deleted', 'page_link', parts[0], 'Deleted page link')
    return new Response(null, { status: 204 })
  }
  return methodNotAllowed()
}

async function routeSettings(context: ApiContext) {
  const session = await requireAdminUnlock(context.request, context.env)
  if (context.request.method === 'GET') return json(await getSettings(context.env))
  if (context.request.method === 'PUT') {
    const settings = await updateSettings(context.env, await readJson(context.request))
    await recordActivity(context, session, 'updated', 'settings', 'private', 'Updated household settings')
    return json(settings)
  }
  return methodNotAllowed()
}

async function routeGallery(context: ApiContext, parts: string[], session: Session) {
  const sub = parts[0] || ''

  if (sub === 'status' && context.request.method === 'GET') {
    return json(await getGalleryStatus(context.env))
  }

  if (sub === 'config' && context.request.method === 'POST') {
    await requireAdminUnlock(context.request, context.env)
    const body = await readJson<{ clientId?: string; clientSecret?: string }>(context.request)
    if (!body.clientId?.trim() || !body.clientSecret?.trim()) throw new ApiError(400, 'clientId and clientSecret are required')
    await saveGoogleConfig(context.env, body.clientId.trim(), body.clientSecret.trim())
    await recordActivity(context, session, 'updated', 'gallery', 'config', 'Updated Google OAuth credentials')
    return json({ ok: true })
  }

  if (sub === 'connect') {
    const session = await requireAdminUnlock(context.request, context.env)
    const config = await getGoogleConfig(context.env)
    if (!config || !context.env.APP_ORIGIN) throw new ApiError(500, 'Google OAuth not configured — add your Client ID and Client Secret in the Gallery admin section.')
    const redirectUri = `${context.env.APP_ORIGIN}/api/gallery/callback`
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', config.clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email')
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    url.searchParams.set('state', session.userId)
    return new Response(null, { status: 302, headers: { Location: url.toString() } })
  }

  if (sub === 'callback' && context.request.method === 'GET') {
    const url = new URL(context.request.url)
    const code = url.searchParams.get('code')
    if (!code) throw new ApiError(400, 'Missing authorization code')
    const config = await getGoogleConfig(context.env)
    if (!config || !context.env.APP_ORIGIN) {
      throw new ApiError(500, 'Google OAuth not configured')
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${context.env.APP_ORIGIN}/api/gallery/callback`,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenResponse.ok) throw new ApiError(502, 'Token exchange failed')
    const tokens = (await tokenResponse.json()) as { access_token: string; refresh_token?: string; expires_in: number }

    let email = ''
    try {
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (userResponse.ok) {
        const user = (await userResponse.json()) as { email?: string }
        email = user.email ?? ''
      }
    } catch { /* noop */ }

    await saveGoogleTokens(context.env, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? '',
      expiresIn: tokens.expires_in,
      email,
    })

    await recordActivity(context, session, 'connected', 'gallery', 'google', `Connected Google Drive${email ? ` (${email})` : ''}`)
    return new Response(null, { status: 302, headers: { Location: '/' } })
  }

  if (sub === 'folder' && context.request.method === 'POST') {
    await requireAdminUnlock(context.request, context.env)
    const body = await readJson<{ folderId?: string; folderName?: string }>(context.request)
    if (!body.folderId) throw new ApiError(400, 'folderId is required')
    await setGalleryFolder(context.env, String(body.folderId), String(body.folderName ?? ''))
    await recordActivity(context, session, 'updated', 'gallery', 'folder', `Set gallery folder to ${body.folderName ?? body.folderId}`)
    return json({ ok: true })
  }

  if (sub === 'disconnect' && context.request.method === 'POST') {
    await requireAdminUnlock(context.request, context.env)
    await disconnectGoogle(context.env)
    await recordActivity(context, session, 'disconnected', 'gallery', 'google', 'Disconnected Google Drive')
    return json({ ok: true })
  }

  return notFound()
}

async function routeWhiteboard(context: ApiContext, parts: string[], session: Session) {
  const method = context.request.method
  if (parts.length === 0) {
    if (method === 'GET') return json(await listWhiteboardStrokes(context.env))
    if (method === 'POST') {
      let strokeInput
      try {
        strokeInput = normaliseWhiteboardStrokeInput(await readJson(context.request))
      } catch (error) {
        throw new ApiError(400, error instanceof Error ? error.message : 'Whiteboard stroke is invalid.')
      }
      const stroke = await createWhiteboardStroke(
        context.env,
        strokeInput,
        session.userId,
        session.displayName || session.userName,
      )
      return json(stroke, { status: 201 })
    }
    return methodNotAllowed()
  }

  const [sub] = parts
  if (sub === 'clear' && method === 'DELETE') {
    await clearWhiteboardStrokes(context.env)
    return json({ ok: true })
  }

  if (method === 'DELETE') {
    const deleted = await deleteWhiteboardStroke(context.env, sub)
    if (!deleted) throw new ApiError(404, 'Stroke not found.')
    return json({ ok: true })
  }

  return methodNotAllowed()
}

async function recordActivity(context: ApiContext, session: Session, action: string, entityType: string, entityId: string, summary: string, metadata: Record<string, unknown> = {}) {
  await logActivity(context.env, {
    actorUserId: session.userId,
    actorName: session.displayName || session.userName,
    action,
    entityType,
    entityId,
    summary,
    metadata,
  })
}

export function requireTrustedOrigin(context: ApiContext) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(context.request.method)) return

  const origin = context.request.headers.get('origin')
  if (!origin) return

  const expectedOrigin = normaliseOrigin(context.env.APP_ORIGIN) ?? new URL(context.request.url).origin
  if (origin !== expectedOrigin) throw new ApiError(403, 'Request origin is not allowed.')
}

function normaliseOrigin(value: string | undefined) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}
