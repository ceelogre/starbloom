const AUTH_NEXT_KEY = 'starbloom.auth-next'

/** Magic-link return paths must stay on the customer orders area. */
export function isOrdersPath(path: string) {
  if (!path.startsWith('/orders') || path.startsWith('//') || path.includes('://')) {
    return false
  }

  return path === '/orders' || path.startsWith('/orders/')
}

export function rememberAuthNext(path: string) {
  if (!isOrdersPath(path)) {
    return
  }

  try {
    sessionStorage.setItem(AUTH_NEXT_KEY, path)
  } catch {
    /* Private mode may block sessionStorage. */
  }
}

export function clearAuthNext() {
  try {
    sessionStorage.removeItem(AUTH_NEXT_KEY)
  } catch {
    /* Ignore. */
  }
}

export function peekAuthNext(search = window.location.search): string {
  const params = new URLSearchParams(search)
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hashParams = new URLSearchParams(hash.includes('=') ? hash : '')
  let next = params.get('next') ?? hashParams.get('next')

  try {
    next = next ?? sessionStorage.getItem(AUTH_NEXT_KEY)
  } catch {
    /* Ignore. */
  }

  if (next && isOrdersPath(next)) {
    return next
  }

  return '/orders'
}
