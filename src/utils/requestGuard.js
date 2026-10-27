export function createRequestGuard() {
  let generation = 0
  let controller = null

  return {
    start() {
      controller?.abort()
      const nextController = new AbortController()
      controller = nextController
      const requestGeneration = ++generation
      return {
        signal: nextController.signal,
        isCurrent: () => requestGeneration === generation && !nextController.signal.aborted,
      }
    },
    invalidate() {
      controller?.abort()
      controller = null
      generation += 1
    },
  }
}
