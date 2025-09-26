'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Token {
  id: string;
  token: string;
  store_id: string;
  store_name: string;
  expires_at: string;
  use_count: number;
  max_uses: number;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  url: string;
}

interface AuthSettings {
  hasAuth: boolean;
  authData: {
    id: string;
    email: string;
    isActive: boolean;
    requireAuth: boolean;
    lastLoginAt?: string;
  } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
  const [copySuccess, setCopySuccess] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [authSettings, setAuthSettings] = useState<{ [key: string]: AuthSettings }>({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);

  useEffect(() => {
    fetchTokens(currentPage);
  }, [currentPage]);

  const fetchTokens = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tokens?page=${page}&limit=20`);
      const { data, pagination, error } = await response.json();

      if (!response.ok) {
        throw new Error(error || 'Failed to fetch tokens');
      }

      setTokens(data || []);
      setPagination(pagination || {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });

      // 各トークンの認証設定を取得
      if (data && data.length > 0) {
        const authPromises = data.map(async (token: Token) => {
          const authResponse = await fetch(`/api/tokens/auth-setup?tokenId=${token.id}`);
          if (authResponse.ok) {
            const authData = await authResponse.json();
            return { tokenId: token.id, ...authData };
          }
          return { tokenId: token.id, hasAuth: false, authData: null };
        });

        const authResults = await Promise.all(authPromises);
        const authMap: { [key: string]: AuthSettings } = {};
        authResults.forEach(result => {
          authMap[result.tokenId] = {
            hasAuth: result.hasAuth,
            authData: result.authData
          };
        });
        setAuthSettings(authMap);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSetup = (token: Token) => {
    setSelectedToken(token);
    const existingAuth = authSettings[token.id];
    if (existingAuth?.authData) {
      setAuthEmail(existingAuth.authData.email);
      setAuthPassword('');
    } else {
      setAuthEmail('');
      setAuthPassword('');
    }
    setShowAuthModal(true);
  };

  const handleAuthSubmit = async () => {
    if (!selectedToken) return;

    setIsAuthProcessing(true);
    try {
      const response = await fetch('/api/tokens/auth-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: selectedToken.id,
          email: authEmail,
          password: authPassword,
          requireAuth: true
        })
      });

      if (!response.ok) {
        throw new Error('認証設定に失敗しました');
      }

      alert('認証設定が完了しました');
      setShowAuthModal(false);
      fetchTokens(currentPage);
    } catch (error) {
      console.error('Error setting up auth:', error);
      alert('認証設定中にエラーが発生しました');
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const handleAuthDisable = async (tokenId: string) => {
    if (!confirm('認証を無効化しますか？')) return;

    try {
      const response = await fetch(`/api/tokens/auth-setup?tokenId=${tokenId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('認証の無効化に失敗しました');
      }

      alert('認証を無効化しました');
      fetchTokens(currentPage);
    } catch (error) {
      console.error('Error disabling auth:', error);
      alert('認証の無効化中にエラーが発生しました');
    }
  };

  const handleDeactivate = async (tokenId: string) => {
    if (!confirm('このトークンを無効化しますか？')) return;

    try {
      const response = await fetch(`/api/tokens?id=${tokenId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('トークンの無効化に失敗しました');
      }

      alert('トークンを無効化しました');
      fetchTokens(currentPage);
    } catch (error) {
      console.error('Error deactivating token:', error);
      alert('トークンの無効化中にエラーが発生しました');
    }
  };

  const copyToClipboard = async (url: string, tokenId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(tokenId);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('コピーに失敗しました');
    }
  };

  const filteredTokens = filterActive === 'all'
    ? tokens
    : tokens.filter(t => filterActive === 'active' ? t.is_active : !t.is_active);

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
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">トークン管理</h1>
              <p className="mt-2 text-sm text-gray-600">
                発行済みトークンの確認・無効化
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

        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilterActive('all')}
              className={`px-4 py-2 rounded-md ${
                filterActive === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              すべて ({tokens.length})
            </button>
            <button
              onClick={() => setFilterActive('active')}
              className={`px-4 py-2 rounded-md ${
                filterActive === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              有効 ({tokens.filter(t => t.is_active).length})
            </button>
            <button
              onClick={() => setFilterActive('inactive')}
              className={`px-4 py-2 rounded-md ${
                filterActive === 'inactive'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              無効 ({tokens.filter(t => !t.is_active).length})
            </button>
          </div>
        </div>

        {filteredTokens.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            トークンがありません
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発行日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">店舗</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">編集URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終使用日時</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">認証</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTokens.map((token) => (
                  <tr key={token.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(token.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{token.store_name}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs text-gray-500">
                          {token.token.substring(0, 8)}...
                        </span>
                        <button
                          onClick={() => copyToClipboard(token.url, token.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="URLをコピー"
                        >
                          {copySuccess === token.id ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {token.last_used_at ? new Date(token.last_used_at).toLocaleDateString('ja-JP') : '未使用'}
                    </td>
                    <td className="px-6 py-4">
                      {authSettings[token.id]?.hasAuth && authSettings[token.id]?.authData?.requireAuth ? (
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            有効
                          </span>
                          {authSettings[token.id]?.authData?.isActive && (
                            <button
                              onClick={() => handleAuthDisable(token.id)}
                              className="text-xs text-red-600 hover:text-red-900"
                            >
                              解除
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAuthSetup(token)}
                          className="text-xs text-blue-600 hover:text-blue-900"
                        >
                          設定
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        token.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {token.is_active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center space-x-2">
                        {token.is_active && (
                          <>
                            <button
                              onClick={() => handleAuthSetup(token)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              認証設定
                            </button>
                            <button
                              onClick={() => handleDeactivate(token.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              無効化
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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

        {/* 認証設定モーダル */}
        {showAuthModal && selectedToken && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                認証設定 - {selectedToken.store_name}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    パスワード
                  </label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={authSettings[selectedToken.id]?.hasAuth ? '変更する場合のみ入力' : 'パスワードを設定'}
                  />
                </div>

                {authSettings[selectedToken.id]?.authData?.lastLoginAt && (
                  <p className="text-sm text-gray-500">
                    最終ログイン: {new Date(authSettings[selectedToken.id].authData!.lastLoginAt!).toLocaleString('ja-JP')}
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAuthSubmit}
                  disabled={isAuthProcessing || !authEmail || !authPassword}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isAuthProcessing ? '処理中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}