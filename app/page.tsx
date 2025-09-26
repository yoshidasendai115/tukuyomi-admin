import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Tukuyomi Admin System
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              管理者専用システム
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/admin/login"
              className="block w-full text-center px-4 py-3 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors"
            >
              管理者ログイン
            </Link>
          </div>

          <div className="mt-8 text-center text-xs text-gray-500">
            <p>© 2024 Tukuyomi. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
