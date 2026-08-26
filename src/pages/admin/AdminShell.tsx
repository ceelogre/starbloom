import { ClipboardList, MessageSquare, Package, Store } from 'lucide-react'
import { DashboardShell } from '../../components/DashboardShell/DashboardShell'

export function AdminShell() {
  return (
    <DashboardShell
      brandTo="/admin"
      kicker="Staff"
      navLabel="Staff sections"
      items={[
        {
          to: '/admin',
          label: 'Orders',
          icon: ClipboardList,
          isActive: (pathname) =>
            pathname === '/admin' || pathname.startsWith('/admin/orders/'),
        },
        {
          to: '/admin/support',
          label: 'Support',
          icon: MessageSquare,
          isActive: (pathname) =>
            pathname === '/admin/support' || pathname.startsWith('/admin/support/'),
        },
        {
          to: '/admin/inventory',
          label: 'Inventory',
          icon: Package,
          isActive: (pathname) =>
            pathname === '/admin/inventory' || pathname.startsWith('/admin/inventory/'),
        },
      ]}
      extras={[
        {
          to: '/',
          label: 'View shop',
          icon: Store,
          isActive: () => false,
        },
      ]}
      signOutTo="/admin/login"
    />
  )
}
