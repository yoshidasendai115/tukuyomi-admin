'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [loginId, setLoginId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginId) {
      setError('ログインIDを入力してください');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loginId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'エラーが発生しました');
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

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
                メールを送信しました
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                ご登録のメールアドレスにパスワードリセット用のリンクを送信しました。
                <br />
                メールに記載されたリンクから、新しいパスワードを設定してください。
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  ご注意
                </h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>リンクの有効期限は30分です</li>
                  <li>メールが届かない場合は、迷惑メールフォルダをご確認ください</li>
                  <li>リンクは1回のみ使用できます</li>
                </ul>
              </div>
              <Link
                href="/admin/login"
                className="inline-block w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                ログイン画面に戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              パスワードをお忘れですか？
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              ログインIDを入力してください。
              <br />
              パスワードリセット用のリンクをメールで送信します。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="loginId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ログインID
              </label>
              <input
                id="loginId"
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ログインIDを入力"
                autoComplete="username"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '送信中...' : 'リセットメールを送信'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link
              href="/admin/login"
              className="block text-sm text-indigo-600 hover:text-indigo-500"
            >
              ログイン画面に戻る
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            © 2024 Tukuyomi. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
