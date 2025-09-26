'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
  name_kana?: string;
  genre?: string;
  area?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  business_hours?: string;
  regular_holiday?: string;
  thumbnail_url?: string;
  is_active: boolean;
  owner_id?: string;
  secondary_phone?: string;
  line_id?: string;
  minimum_hourly_wage?: number;
  maximum_hourly_wage?: number;
  recruitment_status?: 'active' | 'paused' | 'closed';
  recruitment_message?: string;
}

interface Genre {
  id: string;
  name: string;
  description?: string;
  is_visible: boolean;
  display_order: number;
}

interface Area {
  id: string;
  name: string;
  description?: string;
  display_order: number;
}

export default function EditStorePage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [storeId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 店舗情報とマスタデータを並行で取得
      const [storeRes, genresRes, areasRes] = await Promise.all([
        fetch(`/api/stores/${storeId}`),
        fetch('/api/masters/genres'),
        fetch('/api/masters/areas')
      ]);

      if (!storeRes.ok) {
        throw new Error('店舗情報の取得に失敗しました');
      }

      const storeData = await storeRes.json();
      const genresData = await genresRes.json();
      const areasData = await areasRes.json();

      setStore(storeData);

      // is_visibleがtrueの業態のみ表示
      if (!genresData.error) {
        const visibleGenres = (genresData.data || genresData || [])
          .filter((g: Genre) => g.is_visible)
          .sort((a: Genre, b: Genre) => a.display_order - b.display_order);
        setGenres(visibleGenres);
      }

      if (!areasData.error) {
        const sortedAreas = (areasData.data || areasData || [])
          .sort((a: Area, b: Area) => a.display_order - b.display_order);
        setAreas(sortedAreas);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!store) return;

    try {
      setIsSaving(true);
      setError('');
      setSuccessMessage('');

      const response = await fetch(`/api/stores/${storeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(store),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新に失敗しました');
      }

      setSuccessMessage('店舗情報を更新しました');

      // 1秒後にリストページへ戻る
      setTimeout(() => {
        router.push('/admin/stores');
      }, 1000);
    } catch (error) {
      console.error('Error updating store:', error);
      setError(error instanceof Error ? error.message : '更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (!store) return;

    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setStore({
        ...store,
        [name]: target.checked,
      });
    } else if (type === 'number') {
      setStore({
        ...store,
        [name]: value ? Number(value) : null,
      });
    } else {
      setStore({
        ...store,
        [name]: value,
      });
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

  if (error && !store) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
          <Link
            href="/admin/stores"
            className="mt-4 inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            店舗一覧へ戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">店舗編集</h1>
              <p className="mt-2 text-sm text-gray-600">
                店舗ID: {store.id}
              </p>
            </div>
            <Link
              href="/admin/stores"
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              一覧へ戻る
            </Link>
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {/* 成功メッセージ */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
            {successMessage}
          </div>
        )}

        {/* 編集フォーム */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {/* 基本情報 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  店舗名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={store.name || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  店舗名（カナ）
                </label>
                <input
                  type="text"
                  name="name_kana"
                  value={store.name_kana || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  業態
                </label>
                <select
                  name="genre"
                  value={store.genre || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="">選択してください</option>
                  {genres.map(genre => (
                    <option key={genre.id} value={genre.name}>
                      {genre.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  駅
                </label>
                <select
                  name="area"
                  value={store.area || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="">選択してください</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.name}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                住所
              </label>
              <input
                type="text"
                name="address"
                value={store.address || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
          </div>

          {/* 連絡先情報 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">連絡先情報</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話番号
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={store.phone || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  予備電話番号
                </label>
                <input
                  type="tel"
                  name="secondary_phone"
                  value={store.secondary_phone || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  name="email"
                  value={store.email || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LINE ID
                </label>
                <input
                  type="text"
                  name="line_id"
                  value={store.line_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* 営業情報 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">営業情報</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  営業時間
                </label>
                <input
                  type="text"
                  name="business_hours"
                  value={store.business_hours || ''}
                  onChange={handleInputChange}
                  placeholder="例: 18:00～翌3:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  定休日
                </label>
                <input
                  type="text"
                  name="regular_holiday"
                  value={store.regular_holiday || ''}
                  onChange={handleInputChange}
                  placeholder="例: 日曜日"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                店舗説明
              </label>
              <textarea
                name="description"
                value={store.description || ''}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
          </div>

          {/* 求人情報 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">求人情報</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  求人ステータス
                </label>
                <select
                  name="recruitment_status"
                  value={store.recruitment_status || 'closed'}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="active">募集中</option>
                  <option value="paused">一時停止</option>
                  <option value="closed">募集終了</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最低時給
                </label>
                <input
                  type="number"
                  name="minimum_hourly_wage"
                  value={store.minimum_hourly_wage || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最高時給
                </label>
                <input
                  type="number"
                  name="maximum_hourly_wage"
                  value={store.maximum_hourly_wage || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                求人メッセージ
              </label>
              <textarea
                name="recruitment_message"
                value={store.recruitment_message || ''}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
          </div>

          {/* その他 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">その他</h2>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={store.is_active}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                有効（表示する）
              </label>
            </div>
          </div>

          {/* 送信ボタン */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/admin/stores"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}