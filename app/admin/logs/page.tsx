'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AccessLog {
  id: string;
  action: string;
  details: any;
  ip_address: string;
  created_at: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage]);

  const fetchLogs = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/logs?page=${page}&limit=20`);
      const { data, pagination } = await response.json();
      setLogs(data || []);
      setPagination(pagination || {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'admin_login_success': 'ログイン成功',
      'admin_login_failed': 'ログイン失敗',
      'admin_login_blocked': 'ログインブロック',
      'admin_logout': 'ログアウト',
      'store_updated': '店舗情報更新',
      'store_deleted': '店舗削除',
      'request_approved': '申請承認',
      'request_rejected': '申請却下',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('success') || action.includes('approved')) return 'text-green-600';
    if (action.includes('failed') || action.includes('rejected')) return 'text-red-600';
    if (action.includes('blocked')) return 'text-yellow-600';
    return 'text-gray-600';
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">アクセスログ</h1>
              <p className="mt-2 text-sm text-gray-600">
                システムへのアクセス履歴
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

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日時</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">詳細</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IPアドレス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.created_at).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getActionColor(log.action)}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.details && (
                      <pre className="text-xs bg-gray-50 p-1 rounded">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.ip_address || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              ログがありません
            </div>
          )}
        </div>

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
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
    </div>
  );
}