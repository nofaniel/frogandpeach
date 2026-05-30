import { requireSession } from '../src/api/auth'
import type { Env } from '../src/api/types'

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const path = new URL(request.url).pathname

  if (path.startsWith('/pages/') || path.startsWith('/custom-pages/')) {
    try {
      await requireSession(request, env)
    } catch {
      return Response.redirect(new URL('/', request.url), 302)
    }
  }

  return next()
}
