const encoder = new TextEncoder()

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, iterationsRaw, saltB64, expectedB64] = encodedHash.split('$')
  if (algorithm !== 'pbkdf2_sha256') return false

  const iterations = Number(iterationsRaw)
  if (!Number.isInteger(iterations) || iterations < 100_000 || !saltB64 || !expectedB64) return false

  const salt = base64ToBytes(saltB64)
  const expected = base64ToBytes(expectedB64)
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, expected.length * 8)
  return timingSafeEqual(new Uint8Array(bits), expected)
}

export async function hashPassword(password: string, iterations = 100_000) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return `pbkdf2_sha256$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index]
  }
  return diff === 0
}

export async function encryptToken(plaintext: string, keyHex: string): Promise<string> {
  const key = await importAesKey(keyHex)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext))
  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`
}

export async function decryptToken(ciphertext: string, keyHex: string): Promise<string> {
  const [ivB64, dataB64] = ciphertext.split(':')
  if (!ivB64 || !dataB64) throw new Error('Invalid ciphertext format')
  const key = await importAesKey(keyHex)
  const iv = base64ToBytes(ivB64)
  const data = base64ToBytes(dataB64)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new TextDecoder().decode(decrypted)
}

async function importAesKey(hex: string) {
  const bytes = hexToBytes(hex)
  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

function hexToBytes(hex: string) {
  const clean = hex.replace(/\s+/g, '')
  if (clean.length % 2 !== 0) throw new Error('Invalid hex string')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
  }
  return bytes
}
