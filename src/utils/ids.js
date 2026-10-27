let fallbackCounter = 0

function formatUuid(bytes) {
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Generate a UUID in browsers and in test runtimes that do not expose
 * crypto.randomUUID. Existing imported IDs are never passed through this
 * helper, so they remain stable across backup round trips.
 */
export function createUuid() {
  const cryptoObject = globalThis.crypto
  if (typeof cryptoObject?.randomUUID === 'function') {
    return cryptoObject.randomUUID()
  }

  if (typeof cryptoObject?.getRandomValues === 'function') {
    return formatUuid(cryptoObject.getRandomValues(new Uint8Array(16)))
  }

  fallbackCounter += 1
  const time = Date.now().toString(16).padStart(12, '0')
  const counter = fallbackCounter.toString(16).padStart(4, '0')
  const random = `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.padEnd(20, '0')
  return `${time.slice(-8)}-${time.slice(-4)}-4${counter.slice(-3)}-8${random.slice(0, 3)}-${random.slice(3, 15)}`
}

export function createId(prefix) {
  const uuid = createUuid()
  return prefix ? `${prefix}-${uuid}` : uuid
}
