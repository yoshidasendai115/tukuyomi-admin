'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { SessionData } from '@/lib/auth';

interface DashboardStats {
  pendingRequests: number;
  approvedRequests: number;
  activeTokens: number;
  totalStores: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    pendingRequests: 0,
    approvedRequests: 0,
    activeTokens: 0,
    totalStores: 0
  });
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchDashboardStats();

    // ユーザー情報の更新を定期的にチェック（5秒ごと）
    const interval = setInterval(() => {
      checkAuth();
    }, 5000);

    // フォーカス時にも更新をチェック
    const handleFocus = () => {
      checkAuth();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        router.push('/admin/login');
        return;
      }
      const sessionData = await response.json();
      setSession(sessionData);
    } catch (error) {
      console.error('Session fetch error:', error);
      router.push('/admin/login');
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // 申請統計
      const { data: pendingData } = await supabase
        .from('admin_store_edit_requests')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      const { data: approvedData } = await supabase
        .from('admin_store_edit_requests')
        .select('id', { count: 'exact' })
        .eq('status', 'approved');

      // アクティブトークン数
      const { data: tokenData } = await supabase
        .from('admin_store_edit_tokens')
        .select('id', { count: 'exact' })
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString());

      // 店舗数
      const { data: storeData } = await supabase
        .from('stores')
        .select('id', { count: 'exact' });

      setStats({
        pendingRequests: pendingData?.length || 0,
        approvedRequests: approvedData?.length || 0,
        activeTokens: tokenData?.length || 0,
        totalStores: storeData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tukuyomi Admin</h1>
              <p className="text-sm text-gray-600">管理者ダッシュボード</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">{session?.loginId} ({session?.displayName})</p>
                <p className="text-xs text-gray-500">{session?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">未処理申請</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">承認済み申請</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approvedRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">有効トークン</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeTokens}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">総店舗数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStores}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 店舗ユーザー管理 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">店舗ユーザー管理</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <Link
              href="/admin/requests"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">申請管理</h3>
              <p className="text-sm text-gray-600">
                店舗編集URL申請の確認・承認・却下を行います
              </p>
              <div className="mt-4">
                <span className="text-indigo-600 text-sm font-medium">管理画面へ →</span>
              </div>
            </Link>

            <Link
              href="/admin/tokens"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">トークン管理</h3>
              <p className="text-sm text-gray-600">
                発行済みトークンの確認・無効化を行います
              </p>
              <div className="mt-4">
                <span className="text-indigo-600 text-sm font-medium">管理画面へ →</span>
              </div>
            </Link>
          </div>
        </div>

        {/* システム管理 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">システム管理</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              href="/admin/stores"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">店舗管理</h3>
              <p className="text-sm text-gray-600">
                登録店舗の情報確認・編集・管理を行います
              </p>
              <div className="mt-4">
                <span className="text-indigo-600 text-sm font-medium">管理画面へ →</span>
              </div>
            </Link>

            <Link
              href="/admin/logs"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">アクセスログ</h3>
              <p className="text-sm text-gray-600">
                システムへのアクセス履歴を確認します
              </p>
              <div className="mt-4">
                <span className="text-indigo-600 text-sm font-medium">ログ確認へ →</span>
              </div>
            </Link>

            <Link
              href="/admin/notifications"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">お知らせ管理</h3>
              <p className="text-sm text-gray-600">
                システム通知・お知らせの投稿と管理を行います
              </p>
              <div className="mt-4">
                <span className="text-indigo-600 text-sm font-medium">管理画面へ →</span>
              </div>
            </Link>

            <Link
              href="/admin/users"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">管理者管理</h3>
              <p className="text-sm text-gray-600">
                管理者アカウントの作成・権限管理を行います
              </p>
              <div className="mt-4">
                <span className="text-indigo-600 text-sm font-medium">管理画面へ →</span>
              </div>
            </Link>
          </div>
        </div>

        {/* 駅関連管理 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">駅関連管理</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              href="/admin/masters/stations"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">駅マスタ管理</h3>
              <p className="text-sm text-gray-600">
                路線別に駅を管理します
              </p>
              <div className="mt-4">
                <span className="text-indigo-600 text-sm font-medium">管理画面へ →</span>
              </div>
            </Link>

            <Link
              href="/admin/station-groups"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">駅グループ管理</h3>
              <p className="text-sm text-gray-600">
                駅グループとエリアの関連付けを管理します
              </p>
              <div className="mt-4">
                <span className="text-indigo-600 text-sm font-medium">管理画面へ →</span>
              </div>
            </Link>
          </div>
        </div>

        {/* マスタデータ管理 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">マスタデータ管理</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              href="/admin/genres"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">業態マスタ管理</h3>
              <p className="text-sm text-gray-600">
                店舗の業態（ジャンル）を管理します
              </p>
              <div className="mt-4">
                <span className="text-indigo-600 text-sm font-medium">管理画面へ →</span>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}