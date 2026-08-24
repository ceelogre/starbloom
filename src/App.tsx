import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { CustomerLoginPage } from './pages/account/CustomerLoginPage'
import { CustomerOrderDetailPage } from './pages/account/CustomerOrderDetailPage'
import { CustomerOrdersPage } from './pages/account/CustomerOrdersPage'
import { CustomerShell } from './pages/account/CustomerShell'
import { AdminInboxPage } from './pages/admin/AdminInboxPage'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminOrderDetailPage } from './pages/admin/AdminOrderDetailPage'
import { AdminShell } from './pages/admin/AdminShell'
import { ShopPage } from './pages/ShopPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ShopPage />} />
          <Route path="/login" element={<CustomerLoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
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
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
