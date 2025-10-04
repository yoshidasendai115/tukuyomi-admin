'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    const returnParam = searchParams.get('return');
    setReturnUrl(returnParam);
  }, [searchParams]);

  const handleReturn = () => {
    if (returnUrl) {
      router.push(returnUrl);
    } else {
      router.push('/admin/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            アクセス権限がありません
          </h1>
          <p className="text-lg text-gray-600 mb-4">403 Forbidden</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <p className="text-gray-700 mb-4">
            このページへのアクセス権限がありません。
          </p>
          <p className="text-sm text-gray-500 mb-6">
            許可されたページのみアクセス可能です。
          </p>

          <button
            onClick={handleReturn}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
          >
            {returnUrl ? '元のページに戻る' : 'ログインページへ'}
          </button>
        </div>

        <div className="text-sm text-gray-400">
          Error Code: 403 - Unauthorized Access
        </div>
      </div>
    </div>
  );
}
