'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
  name_kana?: string;
  genre: string;
  area: string;
  address: string;
  phone: string;
  email?: string;
  description?: string;
  business_hours?: string;
  regular_holiday?: string;
  thumbnail_url?: string;
  is_active: boolean;
  is_recommended: boolean;
  priority_score: number;
  recommendation_reason?: string;
  recommended_at?: string;
  recommended_by?: string;
  created_at: string;
  updated_at: string;
}

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchStore(params.id as string);
    }
  }, [params.id]);

  const fetchStore = async (id: string) => {
    try {
      const response = await fetch(`/api/stores/${id}`);
      if (response.ok) {
        const data = await response.json();
        setStore(data);
      } else {
        console.error('Failed to fetch store');
      }
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">
          <p className="text-gray-600">店舗情報が見つかりません</p>
          <Link href="/admin/stores" className="mt-4 text-indigo-600 hover:text-indigo-500">
            店舗一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">店舗詳細</h1>
          <div className="space-x-2">
            <Link
              href={`/owner/edit/${store.id}`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              編集
            </Link>
            <Link
              href="/admin/stores"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              一覧に戻る
            </Link>
          </div>
        </div>

        {/* 店舗情報カード */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 基本情報 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">店舗名</dt>
                  <dd className="mt-1 text-sm text-gray-900">{store.name}</dd>
                </div>
                {store.name_kana && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">店舗名（カナ）</dt>
                    <dd className="mt-1 text-sm text-gray-900">{store.name_kana}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">業態</dt>
                  <dd className="mt-1 text-sm text-gray-900">{store.genre || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">エリア（駅）</dt>
                  <dd className="mt-1 text-sm text-gray-900">{store.area || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">住所</dt>
                  <dd className="mt-1 text-sm text-gray-900">{store.address || '-'}</dd>
                </div>
              </dl>
            </div>

            {/* 連絡先情報 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">連絡先情報</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">電話番号</dt>
                  <dd className="mt-1 text-sm text-gray-900">{store.phone || '-'}</dd>
                </div>
                {store.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                    <dd className="mt-1 text-sm text-gray-900">{store.email}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">営業時間</dt>
                  <dd className="mt-1 text-sm text-gray-900">{store.business_hours || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">定休日</dt>
                  <dd className="mt-1 text-sm text-gray-900">{store.regular_holiday || '-'}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* 説明文 */}
          {store.description && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">説明</h2>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{store.description}</p>
            </div>
          )}

          {/* ステータス情報 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ステータス</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">表示状態</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    store.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {store.is_active ? '有効' : '無効'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">優先表示</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    store.is_recommended
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {store.is_recommended ? `★ おすすめ（優先度: ${store.priority_score}）` : '通常'}
                  </span>
                </dd>
              </div>
            </dl>
            {store.is_recommended && store.recommendation_reason && (
              <div className="mt-4">
                <dt className="text-sm font-medium text-gray-500">優先表示理由</dt>
                <dd className="mt-1 text-sm text-gray-900">{store.recommendation_reason}</dd>
              </div>
            )}
          </div>

          {/* システム情報 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">システム情報</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">作成日時</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(store.created_at).toLocaleString('ja-JP')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">更新日時</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(store.updated_at).toLocaleString('ja-JP')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}