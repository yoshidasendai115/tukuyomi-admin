'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setError('無効なリセットリンクです');
    }
  }, [token]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('8文字以上');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('大文字を含む');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('小文字を含む');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('数字を含む');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('特殊文字を含む');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors([]);

    if (!token) {
      setError('無効なリセットリンクです');
      return;
    }

    // パスワードバリデーション
    const errors = validatePassword(newPassword);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'エラーが発生しました');
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
    if (password.length === 0) {
      return { level: 0, label: '', color: '' };
    }

    const errors = validatePassword(password);
    const strength = 5 - errors.length;

    if (strength === 5) {
      return { level: 100, label: '強力', color: 'bg-green-500' };
    } else if (strength >= 3) {
      return { level: 60, label: '普通', color: 'bg-yellow-500' };
    } else {
      return { level: 30, label: '弱い', color: 'bg-red-500' };
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

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
                パスワードを変更しました
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                新しいパスワードでログインできます。
              </p>
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              新しいパスワードを設定
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              新しいパスワードを入力してください
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                新しいパスワード
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={!token}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                placeholder="新しいパスワード"
                autoComplete="new-password"
              />
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">パスワードの強度:</span>
                    <span className={`text-xs font-semibold ${
                      passwordStrength.color === 'bg-green-500' ? 'text-green-600' :
                      passwordStrength.color === 'bg-yellow-500' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.level}%` }}
                    />
                  </div>
                </div>
              )}
              {validationErrors.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  パスワードは以下の条件を満たす必要があります: {validationErrors.join('、')}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                パスワードは8文字以上で、大文字、小文字、数字、特殊文字(!@#$%など)を含む必要があります
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                新しいパスワード（確認）
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={!token}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                placeholder="パスワードを再入力"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'パスワード変更中...' : 'パスワードを変更'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/admin/login"
              className="text-sm text-indigo-600 hover:text-indigo-500"
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
