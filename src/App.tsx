import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute'
import { SiteLayout } from './components/SiteLayout/SiteLayout'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { CustomerLoginPage } from './pages/account/CustomerLoginPage'
import { CustomerOrderDetailPage } from './pages/account/CustomerOrderDetailPage'
import { CustomerOrdersPage } from './pages/account/CustomerOrdersPage'
import { CustomerShell } from './pages/account/CustomerShell'
import { AdminInboxPage } from './pages/admin/AdminInboxPage'
import { AdminInventoryPage } from './pages/admin/AdminInventoryPage'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminOrderDetailPage } from './pages/admin/AdminOrderDetailPage'
import { AdminProductPage } from './pages/admin/AdminProductPage'
import { AdminShell } from './pages/admin/AdminShell'
import { AdminSupportDetailPage } from './pages/admin/AdminSupportDetailPage'
import { AdminSupportPage } from './pages/admin/AdminSupportPage'
import { ContactPage } from './pages/ContactPage'
import { ShopPage } from './pages/ShopPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<ShopPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/inquiry" element={<Navigate to="/contact" replace />} />
            <Route path="/login" element={<CustomerLoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/orders" element={<CustomerShell />}>
              <Route index element={<CustomerOrdersPage />} />
              <Route path=":orderId" element={<CustomerOrderDetailPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute staffOnly />}>
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<AdminInboxPage />} />
              <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
              <Route path="support" element={<AdminSupportPage />} />
              <Route path="support/:inquiryId" element={<AdminSupportDetailPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="inventory/new" element={<AdminProductPage />} />
              <Route path="inventory/:productId" element={<AdminProductPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
