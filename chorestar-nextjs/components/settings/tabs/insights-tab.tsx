'use client'

export function InsightsTab() {
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          Analytics & Insights
        </h3>
        <p className="text-base mb-6 text-gray-600 dark:text-gray-400">
          Track progress, view trends, and get smart insights about your family's chore completion
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-8">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Progress Trends</div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Achievements</div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-2">🔔</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Notifications</div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Date Ranges</div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl max-w-md mx-auto">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
            🚀 Coming in next update with charts and detailed analytics
          </p>
        </div>
      </div>
    </div>
  )
}
