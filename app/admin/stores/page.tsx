'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
  name_kana: string;
  genre: string;
  area: string;
  address: string;
  phone: string;
  is_active: boolean;
  is_recommended: boolean;
  priority_score: number;
  recommendation_reason?: string;
  created_at: string;
  updated_at: string;
}

interface Area {
  id: string;
  name: string;
  description: string;
  display_order: number;
}

interface Genre {
  id: string;
  name: string;
  description: string;
  is_visible: boolean;
  display_order: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage]);

  const fetchData = async (page: number = 1) => {
    try {
      setIsLoading(true);

      // 店舗データとマスタデータを並行して取得
      const [storesRes, areasRes, genresRes] = await Promise.all([
        fetch(`/api/stores?page=${page}&limit=20`),
        fetch('/api/masters/areas'),
        fetch('/api/masters/genres')
      ]);

      const storesData = await storesRes.json();
      const areasData = await areasRes.json();
      const genresData = await genresRes.json();

      if (storesData.error) {
        console.error('Error fetching stores:', storesData.error);
      } else {
        setStores(storesData.data || []);
        setPagination(storesData.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        });
      }

      if (!areasData.error) {
        setAreas(areasData.data || areasData || []);
      }

      if (!genresData.error) {
        // is_visibleがtrueのもののみ表示
        const visibleGenres = (genresData.data || genresData || []).filter((g: Genre) => g.is_visible);
        setGenres(visibleGenres);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusToggle = async (storeId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        fetchData(currentPage); // 再読み込み
      }
    } catch (error) {
      console.error('Error updating store status:', error);
    }
  };

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          store.name_kana.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = !selectedArea || store.area === selectedArea;
    const matchesGenre = !selectedGenre || store.genre === selectedGenre;
    const matchesActive = showInactive || store.is_active;

    return matchesSearch && matchesArea && matchesGenre && matchesActive;
  });

  // 業態（area）のオプションを作成
  const areaOptions = areas.sort((a, b) => a.display_order - b.display_order);
  // 状態（genre）のオプションを作成
  const genreOptions = genres.sort((a, b) => a.display_order - b.display_order);

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">店舗管理</h1>
              <p className="mt-2 text-sm text-gray-600">
                全店舗数: {pagination.total}件 / 現在のページ: {stores.length}件
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              ダッシュボードへ戻る
            </Link>
          </div>
        </div>

        {/* 検索フィルター */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                店舗名検索
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="店舗名または店舗名（カナ）"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                業態
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="">すべての業態</option>
                {genreOptions.map(genre => (
                  <option key={genre.id} value={genre.name}>{genre.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                駅
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="">すべての駅</option>
                {areaOptions.map(area => (
                  <option key={area.id} value={area.name}>{area.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                対象店舗
              </label>
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  id="show-inactive"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="show-inactive" className="text-sm text-gray-700">
                  無効な店舗も表示
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 店舗一覧テーブル */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  店舗情報
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  業態 / 駅
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  連絡先
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  対象店舗
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  優先表示
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStores.map((store) => (
                <tr key={store.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {store.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {store.name_kana}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{store.genre || '-'}</div>
                    <div className="text-sm text-gray-500">{store.area || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{store.phone || '-'}</div>
                    <div className="text-sm text-gray-500">
                      {store.address ? store.address.substring(0, 20) + '...' : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleStatusToggle(store.id, store.is_active)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        store.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {store.is_active ? '有効' : '無効'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRecommendToggle(store.id, store.is_recommended)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          store.is_recommended
                            ? 'bg-yellow-400 text-yellow-900'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {store.is_recommended ? '★ おすすめ' : '通常'}
                      </button>
                      {store.is_recommended && (
                        <span className="text-xs text-gray-500">
                          優先度: {store.priority_score}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/admin/stores/${store.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      詳細
                    </Link>
                    <Link
                      href={`/admin/stores/${store.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStores.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              該当する店舗が見つかりません
            </div>
          )}
        </div>

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                前へ
              </button>
              <button
                onClick={() => setCurrentPage(page => Math.min(page + 1, pagination.totalPages))}
                disabled={currentPage === pagination.totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === pagination.totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                次へ
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  全 <span className="font-medium">{pagination.total}</span> 件中{' '}
                  <span className="font-medium">{(currentPage - 1) * pagination.limit + 1}</span> -{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pagination.limit, pagination.total)}
                  </span> 件を表示
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">前へ</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* ページ番号ボタン */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNumber;
                    if (pagination.totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNumber = pagination.totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNumber
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(page => Math.min(page + 1, pagination.totalPages))}
                    disabled={currentPage === pagination.totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === pagination.totalPages
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">次へ</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* おすすめ設定モーダル */}
      {showRecommendModal && selectedStore && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">おすすめ店舗に設定</h3>
            <p className="text-sm text-gray-600 mb-4">
              「{selectedStore.name}」をおすすめ店舗に設定します
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                優先度スコア (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={priorityScore}
                onChange={(e) => setPriorityScore(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                数値が大きいほど優先的に表示されます
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                おすすめ理由（任意）
              </label>
              <textarea
                value={recommendationReason}
                onChange={(e) => setRecommendationReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                placeholder="例：雰囲気が良く、初心者にもおすすめ"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRecommendModal(false);
                  setSelectedStore(null);
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (selectedStore) {
                    handleRecommendUpdate(
                      selectedStore.id,
                      true,
                      priorityScore,
                      recommendationReason
                    );
                  }
                }}
                className="px-4 py-2 text-sm text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                設定する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}