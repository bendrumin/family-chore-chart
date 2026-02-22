import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="text-8xl mb-4">🔍</div>

        <h1 className="text-6xl font-black text-gray-900 mb-2">404</h1>

        <h2 className="text-2xl font-bold text-gray-700 mb-4">
          Page Not Found
        </h2>

        <p className="text-gray-600 mb-8">
          Looks like this page is playing hide and seek! Let's get you back on track.
        </p>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/"
            className="block w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all"
          >
            Back to Home
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">Popular pages:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/dashboard" className="text-xs px-3 py-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
              Dashboard
            </Link>
            <Link href="/how-to" className="text-xs px-3 py-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
              How-To Guides
            </Link>
            <Link href="/login" className="text-xs px-3 py-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
