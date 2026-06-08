import type { Metadata } from 'next'
import { requireAdminPage } from '@/lib/admin/require-admin'
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  await requireAdminPage()

  return <AdminDashboardClient />
}
