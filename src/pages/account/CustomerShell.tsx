import { ClipboardList, Store } from 'lucide-react'
import { DashboardShell } from '../../components/DashboardShell/DashboardShell'

export function CustomerShell() {
  return (
    <DashboardShell
      brandTo="/"
      navLabel="Account"
      items={[
        {
          to: '/',
          label: 'Shop',
          icon: Store,
          isActive: (pathname) => pathname === '/',
        },
        {
          to: '/orders',
          label: 'Your orders',
          icon: ClipboardList,
          isActive: (pathname) =>
            pathname === '/orders' || pathname.startsWith('/orders/'),
        },
      ]}
      signOutTo="/"
    />
  )
}
