import { Outlet } from 'react-router'
import { Header } from '../Header/Header'

export function SiteLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}
