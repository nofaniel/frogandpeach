import { describe, expect, it } from 'vitest'
import { verifyPassword } from './crypto'

describe('password verification', () => {
  it('verifies the documented development hash format', async () => {
    const hash = 'pbkdf2_sha256$150000$MTIzNDU2Nzg5MGFiY2RlZg==$ge53foJlF2qdYXyutYP1swroPrnCghz0qeK2KLkYjik='

    await expect(verifyPassword('change-me', hash)).resolves.toBe(true)
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false)
  })
})
