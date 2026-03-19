export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  )
}
