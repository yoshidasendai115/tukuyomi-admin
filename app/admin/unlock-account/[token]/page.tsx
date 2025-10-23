'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function UnlockAccountTokenPage() {
  const params = useParams();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('無効なロック解除リンクです');
      setIsLoading(false);
      return;
    }

    // ページロード時に自動的にロック解除を実行
    const unlockAccount = async () => {
      try {
        const response = await fetch('/api/auth/unlock-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'エラーが発生しました');
          return;
        }

        setIsSuccess(true);
      } catch (err) {
        console.error('Unlock account error:', err);
        setError('予期しないエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    unlockAccount();
  }, [token]);

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg
                  className="animate-spin h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                アカウントのロックを解除しています...
              </h2>
              <p className="text-sm text-gray-600">
                しばらくお待ちください
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 成功
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                アカウントのロックを解除しました
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                アカウントのロックが正常に解除されました。
                <br />
                再度ログインできるようになりました。
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  セキュリティに関するお知らせ
                </h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>このロック解除に心当たりがない場合は、すぐにパスワードを変更してください</li>
                  <li>不正アクセスの疑いがある場合は、運営チームまでお問い合わせください</li>
                  <li>定期的にパスワードを変更することをお勧めします</li>
                </ul>
              </div>
              <Link
                href="/admin/login"
                className="inline-block w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                ログイン画面へ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // エラー
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              ロック解除に失敗しました
            </h2>
            <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                考えられる原因
              </h3>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>リンクの有効期限が切れています（30分）</li>
                <li>リンクは既に使用されています</li>
                <li>リンクが正しくありません</li>
                <li>アカウントは既にロック解除されています</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Link
                href="/admin/unlock-account"
                className="block w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                新しいロック解除リンクを送信
              </Link>
              <Link
                href="/admin/login"
                className="block w-full py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
              >
                ログイン画面に戻る
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            © 2025 がるなび All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
