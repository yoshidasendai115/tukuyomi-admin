'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

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
    setErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });

    // クライアント側バリデーション
    if (!formData.currentPassword) {
      setErrors(prev => ({ ...prev, currentPassword: '現在のパスワードを入力してください' }));
      return;
    }

    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      setErrors(prev => ({
        ...prev,
        newPassword: `パスワードは以下の条件を満たす必要があります: ${passwordErrors.join('、')}`
      }));
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '新しいパスワードが一致しません' }));
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error.includes('現在のパスワード')) {
          setErrors(prev => ({ ...prev, currentPassword: result.error }));
        } else {
          alert(result.error || 'エラーが発生しました');
        }
        return;
      }

      alert('パスワードを変更しました');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      router.push('/admin/dashboard');

    } catch (error) {
      console.error('Error:', error);
      alert('予期しないエラーが発生しました');
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

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">パスワード変更</h1>
          <p className="mt-2 text-sm text-gray-600">
            セキュリティのため、定期的にパスワードを変更することをお勧めします
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                現在のパスワード <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                autoComplete="current-password"
              />
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                新しいパスワード <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                autoComplete="new-password"
              />
              {formData.newPassword && (
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
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                パスワードは8文字以上で、大文字、小文字、数字、特殊文字(!@#$%など)を含む必要があります
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                新しいパスワード（確認） <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? '変更中...' : 'パスワードを変更'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">セキュリティのヒント</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>他のサービスで使用していないパスワードを設定してください</li>
            <li>定期的にパスワードを変更することをお勧めします</li>
            <li>パスワードは他人と共有しないでください</li>
            <li>推測されやすい単語や個人情報は避けてください</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
