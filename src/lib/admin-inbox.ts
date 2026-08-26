const INBOX_SEARCH_KEY = 'starbloom.admin-inbox'

export function rememberAdminInboxSearch(search: string) {
  try {
    if (search && search !== '?') {
      sessionStorage.setItem(INBOX_SEARCH_KEY, search.startsWith('?') ? search : `?${search}`)
    } else {
      sessionStorage.removeItem(INBOX_SEARCH_KEY)
    }
  } catch {
    /* Private mode may block sessionStorage. */
  }
}

export function adminInboxHref() {
  try {
    return `/admin${sessionStorage.getItem(INBOX_SEARCH_KEY) ?? ''}`
  } catch {
    return '/admin'
  }
}
