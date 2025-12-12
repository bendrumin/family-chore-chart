'use client'

export function InsightsTab() {
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Analytics & Insights
        </h3>
        <p className="text-base mb-6" style={{ color: 'var(--text-secondary)' }}>
          Track progress, view trends, and get smart insights about your family's chore completion
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-8">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-sm font-bold">Progress Trends</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-sm font-bold">Achievements</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="text-3xl mb-2">🔔</div>
            <div className="text-sm font-bold">Notifications</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-sm font-bold">Date Ranges</div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl max-w-md mx-auto">
          <p className="text-sm font-semibold text-blue-900">
            🚀 Coming in next update with charts and detailed analytics
          </p>
        </div>
      </div>
    </div>
  )
}
