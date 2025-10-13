'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SessionData } from '@/lib/auth';

// Note: このページはMiddlewareでstore_ownerのアクセスをブロック済み

interface PlanStat {
  planId: string;
  planName: string;
  displayName: string;
  count: number;
  icon: string;
  bgColor: string;
}

interface DashboardStats {
  pendingRequests: number;
  approvedRequests: number;
  totalStores: number;
  planStats: PlanStat[];
  pendingReviewReports: number;
  expiredStores: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    pendingRequests: 0,
    approvedRequests: 0,
    totalStores: 0,
    planStats: [],
    pendingReviewReports: 0,
    expiredStores: 0
  });
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

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
      const response = await fetch('/api/auth/session', {
        signal: AbortSignal.timeout(5000) // 5秒でタイムアウト
      });

      if (!response.ok) {
        // セッション切れまたは認証エラー
        if (!isRedirecting) {
          setIsRedirecting(true);
          setShowSessionExpired(true);
          setTimeout(() => {
            router.push('/admin/login');
          }, 2000);
        }
        return;
      }

      const sessionData = await response.json();

      // store_ownerはダッシュボードにアクセスできない
      if (sessionData.role === 'store_owner' && !isRedirecting) {
        console.log('[Dashboard] Blocking store_owner access');
        setIsRedirecting(true);
        const allowedUrl = sessionData.allowedUrl || `/admin/stores/${sessionData.assignedStoreId}/edit`;
        router.push(allowedUrl);
        return;
      }

      setSession(sessionData);
    } catch (error) {
      // ネットワークエラーまたはタイムアウト
      console.error('Session fetch error:', error);

      // 既にリダイレクト中でなければセッション切れメッセージを表示
      if (!isRedirecting) {
        setIsRedirecting(true);
        setShowSessionExpired(true);
        setTimeout(() => {
          router.push('/admin/login');
        }, 2000);
      }
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();

      // アイコンと背景色のマッピング
      const planIconMap: Record<string, { icon: string; bgColor: string }> = {
        'free': { icon: '💵', bgColor: 'bg-blue-100' },
        'light': { icon: '🥉', bgColor: 'bg-amber-100' },
        'basic': { icon: '🥈', bgColor: 'bg-gray-100' },
        'premium5': { icon: '💎', bgColor: 'bg-cyan-100' },
        'premium10': { icon: '🥇', bgColor: 'bg-yellow-100' },
        'premium15': { icon: '👑', bgColor: 'bg-purple-100' },
      };

      // プラン統計にアイコンと背景色を追加
      const planStatsWithIcons: PlanStat[] = data.planStats.map((plan: { planId: string; planName: string; displayName: string; count: number }) => {
        const iconConfig = planIconMap[plan.planName] || { icon: '📦', bgColor: 'bg-gray-100' };
        return {
          ...plan,
          icon: iconConfig.icon,
          bgColor: iconConfig.bgColor,
        };
      });

      setStats({
        pendingRequests: data.pendingRequests,
        approvedRequests: data.approvedRequests,
        totalStores: data.totalStores,
        planStats: planStatsWithIcons,
        pendingReviewReports: data.pendingReviewReports,
        expiredStores: data.expiredStores
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

  // セッション切れメッセージ
  if (showSessionExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 mb-2">セッションが切れました</h2>
          <p className="text-gray-600 mb-4">
            セキュリティのため、自動的にログアウトしました。
          </p>
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
            <p className="text-sm text-gray-500">ログインページに移動しています...</p>
          </div>
        </div>
      </div>
    );
  }

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
              <Link
                href="/admin/settings/password"
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                パスワード変更
              </Link>
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
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">システム統計</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-xl">⏳</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">未処理申請</p>
                <p className="text-lg font-bold text-gray-900">{stats.pendingRequests}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">未対応通報</p>
                <p className="text-lg font-bold text-gray-900">{stats.pendingReviewReports}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">承認済み申請</p>
                <p className="text-lg font-bold text-gray-900">{stats.approvedRequests}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-xl">🏪</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">総店舗数</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalStores}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-xl">⏰</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">プラン期限切れ</p>
                <p className="text-lg font-bold text-gray-900">{stats.expiredStores}</p>
              </div>
            </div>
          </div>
        </div>

        {/* プラン別統計カード（コンパクト表示） */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">プラン別店舗数</h3>
          <div className="flex items-center justify-between">
            {stats.planStats.map((plan) => (
              <div key={plan.planId} className="flex items-center space-x-2">
                <div className={`p-2 ${plan.bgColor} rounded-lg`}>
                  <span className="text-xl">{plan.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{plan.displayName}</p>
                  <p className="text-lg font-bold text-gray-900">{plan.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 店舗ユーザー管理 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">店舗ユーザー管理</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/admin/requests"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">申請管理</h3>
              <p className="text-sm text-gray-600">
                店舗編集アカウント申請の確認・承認・却下を行います
              </p>
              <div className="mt-4">
                <span className="text-indigo-600 text-sm font-medium">管理画面へ →</span>
              </div>
            </Link>

            <Link
              href="/admin/review-reports"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">口コミ通報管理</h3>
              <p className="text-sm text-gray-600">
                ユーザーから報告された口コミを確認・処理します
              </p>
              <div className="mt-4">
                <span className="text-indigo-600 text-sm font-medium">管理画面へ →</span>
              </div>
            </Link>
          </div>
        </div>

        {/* システム管理 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">システム管理</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">駅関連管理</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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