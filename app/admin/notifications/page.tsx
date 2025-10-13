'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'message' | 'application' | 'system' | 'campaign';
  link?: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'system' as 'message' | 'application' | 'system' | 'campaign',
    link: ''
  });

  useEffect(() => {
    fetchNotifications(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
        resetForm();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal]);

  const fetchNotifications = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/notifications?page=${page}&limit=20`);
      const { data, pagination, error } = await response.json();

      if (!response.ok) {
        throw new Error(error || 'お知らせの取得に失敗しました');
      }

      setNotifications(data || []);
      setPagination(pagination || {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      alert('お知らせデータの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = editingNotification ? 'PUT' : 'POST';
      const body = editingNotification
        ? { ...formData, id: editingNotification.id }
        : formData;

      const response = await fetch('/api/notifications', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'エラーが発生しました');
        return;
      }

      alert(editingNotification ? '更新しました' : '追加しました');
      setShowModal(false);
      resetForm();
      fetchNotifications(currentPage);
    } catch (error) {
      console.error('Error:', error);
      alert('エラーが発生しました');
    }
  };

  const handleEdit = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      title: notification.title,
      content: notification.content,
      type: notification.type,
      link: notification.link || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (notification: Notification) => {
    if (!confirm(`「${notification.title}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/notifications?id=${notification.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || '削除に失敗しました');
        return;
      }

      alert('削除しました');
      fetchNotifications(currentPage);
    } catch (error) {
      console.error('Error:', error);
      alert('削除に失敗しました');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'system',
      link: ''
    });
    setEditingNotification(null);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'message': 'メッセージ',
      'application': '申請',
      'system': 'システム',
      'campaign': 'キャンペーン'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'message': 'bg-blue-100 text-blue-800',
      'application': 'bg-green-100 text-green-800',
      'system': 'bg-gray-100 text-gray-800',
      'campaign': 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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
              <h1 className="text-2xl font-bold text-gray-900">お知らせ管理</h1>
              <p className="mt-2 text-sm text-gray-600">
                システム全体向けのお知らせを管理
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                新規追加
              </button>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                ダッシュボードへ戻る
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイトル</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">作成日</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{notification.title}</div>
                    <div className="text-sm text-gray-500">{notification.content.substring(0, 100)}...</div>
                    {notification.link && (
                      <a href={notification.link} className="text-sm text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                        リンク
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(notification.type)}`}>
                      {getTypeLabel(notification.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(notification.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(notification)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(notification)}
                      className="text-red-600 hover:text-red-900"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {notifications.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              お知らせがありません
            </div>
          )}
        </div>

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
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
                    前へ
                  </button>

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
                    次へ
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* モーダル */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingNotification ? 'お知らせ編集' : '新規お知らせ'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      タイトル <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 px-3 py-2 border"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      内容 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={5}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 px-3 py-2 border"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700">タイプ</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 px-3 py-2 border"
                    >
                      <option value="system">システム</option>
                      <option value="message">メッセージ</option>
                      <option value="application">申請</option>
                      <option value="campaign">キャンペーン</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      リンクURL（任意）
                    </label>
                    <input
                      type="url"
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 px-3 py-2 border"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {editingNotification ? '更新' : '追加'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}