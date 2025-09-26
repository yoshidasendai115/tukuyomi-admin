'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AdminUser {
  id: string;
  login_id: string;
  display_name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator';
  is_active: boolean;
  last_login_at: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    login_id: '',
    password: '',
    display_name: '',
    email: '',
    role: 'moderator' as 'super_admin' | 'admin' | 'moderator',
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');

      if (!response.ok) {
        console.error('Failed to fetch users, status:', response.status);
        if (response.status === 401) {
          alert('セッションの有効期限が切れました。再ログインしてください。');
          window.location.href = '/admin/login';
          return;
        }
      }

      const { data, error } = await response.json();

      if (error) {
        console.error('Error from API:', error);
        throw new Error(error);
      }

      console.log('Fetched users:', data);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('管理者データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingUser ? '/api/users' : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser
        ? { ...formData, id: editingUser.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'エラーが発生しました');
        return;
      }

      alert(editingUser ? '管理者を更新しました' : '管理者を追加しました');
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error:', error);
      alert('エラーが発生しました');
    }
  };

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      login_id: user.login_id,
      password: '',
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`${user.display_name}を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${user.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || '削除に失敗しました');
        return;
      }

      alert('管理者を削除しました');
      fetchUsers();
    } catch (error) {
      console.error('Error:', error);
      alert('削除に失敗しました');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      login_id: '',
      password: '',
      display_name: '',
      email: '',
      role: 'moderator',
      is_active: true
    });
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      moderator: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      super_admin: 'スーパー管理者',
      admin: '管理者',
      moderator: '閲覧者',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[role as keyof typeof colors]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
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
              <h1 className="text-2xl font-bold text-gray-900">管理者管理</h1>
              <p className="mt-2 text-sm text-gray-600">
                管理者アカウントの作成・権限管理
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                新規管理者追加
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ログインID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">表示名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">メールアドレス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">権限</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終ログイン</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.login_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.display_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleString('ja-JP')
                      : '未ログイン'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      編集
                    </button>
                    {user.role !== 'super_admin' && (
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              管理者が登録されていません
            </div>
          )}
        </div>
      </div>

      {/* 追加・編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4">
            <form onSubmit={handleSubmit} className="p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                {editingUser ? '管理者編集' : '新規管理者追加'}
              </h2>

              <div className="space-y-4">
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ログインID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.login_id}
                      onChange={(e) => setFormData({ ...formData, login_id: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {editingUser ? 'パスワード（変更する場合のみ）' : 'パスワード'}
                    {!editingUser && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    表示名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    権限
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={editingUser?.role === 'super_admin'}
                  >
                    <option value="moderator">閲覧者</option>
                    <option value="admin">管理者</option>
                    {editingUser?.role === 'super_admin' && (
                      <option value="super_admin">スーパー管理者</option>
                    )}
                  </select>
                  {editingUser?.role === 'super_admin' && (
                    <p className="mt-1 text-xs text-gray-500">
                      ※ スーパー管理者の権限は変更できません
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    アカウントを有効にする
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingUser ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}