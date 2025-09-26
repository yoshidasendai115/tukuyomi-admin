'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function StoreLoginPage({ params }: { params: { uuid: string } }) {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState('');
  const [storeInfo, setStoreInfo] = useState<{ name: string; id: string } | null>(null);

  useEffect(() => {
    validateUUID();
  }, []);

  const validateUUID = async () => {
    try {
      // UUIDに対応するトークンと店舗情報を取得
      const { data: tokenData, error: tokenError } = await supabase
        .from('admin_store_edit_tokens')
        .select('*, stores(*)')
        .eq('edit_url_uuid', params.uuid)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        setError('無効なURLです。管理者にお問い合わせください。');
        setIsValidating(false);
        return;
      }

      // 店舗情報を設定
      setStoreInfo({
        name: tokenData.stores?.name || '',
        id: tokenData.store_id
      });

      setIsValidating(false);
    } catch (err) {
      console.error('UUID validation error:', err);
      setError('URLの検証中にエラーが発生しました。');
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginId || !password) {
      setError('ログインIDとパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 店舗認証
      const { data, error } = await supabase.rpc('authenticate_store', {
        p_login_id: loginId,
        p_password: password,
        p_ip_address: 'client_ip' // 実際にはサーバーサイドでIPを取得
      });

      if (error) {
        console.error('Authentication error:', error);
        setError('認証中にエラーが発生しました');
        return;
      }

      if (data.success) {
        // 認証成功 - セッションストレージに保存
        sessionStorage.setItem('store_uuid', params.uuid);
        sessionStorage.setItem('store_id', data.store_id);
        sessionStorage.setItem('store_authenticated', 'true');
        sessionStorage.setItem('auth_timestamp', new Date().toISOString());

        // 編集ページへリダイレクト
        router.push(`/store/${params.uuid}/edit`);
      } else {
        setError(data.message || 'ログインに失敗しました');
        if (data.attempts_remaining !== undefined) {
          setError(prev => `${prev}（残り試行回数: ${data.attempts_remaining}回）`);
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">URLを検証中...</p>
        </div>
      </div>
    );
  }

  if (!storeInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">アクセスエラー</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            トップページへ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">店舗ログイン</h1>
            <p className="mt-2 text-sm text-gray-600">
              {storeInfo.name}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="loginId" className="block text-sm font-medium text-gray-700 mb-1">
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="パスワードを入力"
                autoComplete="current-password"
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
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ログインIDとパスワードは、承認メールに記載されています。
              <br />
              ご不明な場合は管理者にお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}