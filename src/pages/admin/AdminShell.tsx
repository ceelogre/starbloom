import { ClipboardList, MessageSquare, Package } from 'lucide-react'
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
      signOutTo="/admin/login"
    />
  )
}
