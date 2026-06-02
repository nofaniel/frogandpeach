import { describe, expect, it } from 'vitest'
import { ApiError } from './http'
import { requireTrustedOrigin } from './router'

describe('API origin guard', () => {
  it('allows safe read methods without an origin check', () => {
    const context = {
      request: new Request('https://frog-peach-home-hub.pages.dev/api/home'),
      env: {},
    }

    expect(() => requireTrustedOrigin(context as any)).not.toThrow()
  })

  it('blocks cross-origin browser writes', () => {
    const context = {
      request: new Request('https://frog-peach-home-hub.pages.dev/api/notes', {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      }),
      env: { APP_ORIGIN: 'https://frog-peach-home-hub.pages.dev' },
    }

    expect(() => requireTrustedOrigin(context as any)).toThrow(ApiError)
  })

  it('allows same-origin browser writes', () => {
    const context = {
      request: new Request('https://frog-peach-home-hub.pages.dev/api/notes', {
        method: 'POST',
        headers: { origin: 'https://frog-peach-home-hub.pages.dev' },
      }),
      env: { APP_ORIGIN: 'https://frog-peach-home-hub.pages.dev' },
    }

    expect(() => requireTrustedOrigin(context as any)).not.toThrow()
  })
})
