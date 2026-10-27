import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
afterEach(cleanup)
// Vitest 3 omits Node 26's existing web-storage globals when copying jsdom.
// Use jsdom's real Storage instance, rather than a hand-written storage mock.
if (globalThis.jsdom) {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => globalThis.jsdom.window.localStorage })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get: () => globalThis.jsdom.window.sessionStorage })
}
if (globalThis.jsdom) {
  // jsdom has no layout/scroll implementation; browser tests verify real scrolling.
  globalThis.HTMLElement.prototype.scrollTo = function () {}
  globalThis.HTMLElement.prototype.scrollIntoView = function () {}
}
