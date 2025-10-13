'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Area {
  id: string;
  name: string;
}

interface StationGroupMember {
  id: string;
  station_id: string;
  station?: Area;
}

interface StationGroup {
  id: string;
  name: string;
  display_name: string;
  is_major_terminal: boolean;
  description: string;
  created_at: string;
  station_group_members?: StationGroupMember[];
}

export default function StationGroupsPage() {
  const [groups, setGroups] = useState<StationGroup[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StationGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<StationGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    is_major_terminal: false,
    description: '',
    member_area_ids: [] as string[]
  });
  const [areaSearchQuery, setAreaSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showModal) {
          setShowModal(false);
          resetForm();
        }
        if (showDetailModal) {
          setShowDetailModal(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal, showDetailModal]);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchGroups(), fetchAreas()]);
    setIsLoading(false);
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/masters/station-groups');
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      const { data } = await response.json();
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching station groups:', error);
    }
  };

  const fetchAreas = async () => {
    try {
      const response = await fetch('/api/masters/stations');
      const { data } = await response.json();
      setAreas(data || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = editingGroup ? 'PUT' : 'POST';
      const body = editingGroup
        ? { ...formData, id: editingGroup.id }
        : formData;

      const response = await fetch('/api/masters/station-groups', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'エラーが発生しました');
        return;
      }

      alert(editingGroup ? '更新しました' : '追加しました');
      setShowModal(false);
      resetForm();
      fetchGroups();
    } catch (error) {
      console.error('Error:', error);
      alert('エラーが発生しました');
    }
  };

  const handleEdit = (group: StationGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      display_name: group.display_name,
      is_major_terminal: group.is_major_terminal,
      description: group.description || '',
      member_area_ids: group.station_group_members?.map(m => m.station_id) || []
    });
    setAreaSearchQuery(''); // 検索フィールドをクリア
    setShowModal(true);
  };

  const handleDelete = async (group: StationGroup) => {
    if (!confirm(`${group.display_name}を削除してもよろしいですか？\n関連する駅グループメンバーも全て削除されます。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/masters/station-groups?id=${group.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || '削除に失敗しました');
        return;
      }

      alert('削除しました');
      fetchGroups();
    } catch (error) {
      console.error('Error:', error);
      alert('削除に失敗しました');
    }
  };

  const handleViewDetail = (group: StationGroup) => {
    setSelectedGroup(group);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      display_name: '',
      is_major_terminal: false,
      description: '',
      member_area_ids: []
    });
    setAreaSearchQuery('');
  };

  const getAreaName = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    return area?.name || areaId;
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
              <h1 className="text-2xl font-bold text-gray-900">駅グループ管理</h1>
              <p className="mt-2 text-sm text-gray-600">
                駅グループとエリアの関連付けを管理
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
                新規グループ追加
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

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                駅グループ一覧 ({groups.length}件)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">グループID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">表示名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">主要ターミナル</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">メンバー数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">説明</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groups.map((group) => (
                    <tr key={group.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {group.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {group.display_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {group.is_major_terminal ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            主要ターミナル
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
                            通常
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleViewDetail(group)}
                          className="text-indigo-600 hover:text-indigo-900 underline"
                        >
                          {group.station_group_members?.length || 0}件
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">
                          {group.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetail(group)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          詳細
                        </button>
                        <button
                          onClick={() => handleEdit(group)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(group)}
                          className="text-red-600 hover:text-red-900"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {groups.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  駅グループが登録されていません
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 追加・編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-2xl w-full mx-4 my-8">
            <form onSubmit={handleSubmit} className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingGroup ? '駅グループ編集' : '新規駅グループ追加'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      グループID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editingGroup ? 'bg-gray-100' : ''}`}
                      placeholder="例: shibuya_area"
                      disabled={!!editingGroup}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      表示名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="例: 渋谷エリア"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">
                    説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="グループの説明を入力"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_major_terminal"
                    checked={formData.is_major_terminal}
                    onChange={(e) => setFormData({ ...formData, is_major_terminal: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_major_terminal" className="ml-2 block text-sm text-gray-900">
                    主要ターミナル駅として設定
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メンバーエリア
                  </label>
                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="エリアを検索..."
                      value={areaSearchQuery}
                      onChange={(e) => setAreaSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto">
                    {areas
                      .filter(area =>
                        area.name.toLowerCase().includes(areaSearchQuery.toLowerCase())
                      )
                      .map((area) => (
                        <div key={area.id} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id={`area-${area.id}`}
                            checked={formData.member_area_ids.includes(area.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  member_area_ids: [...formData.member_area_ids, area.id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  member_area_ids: formData.member_area_ids.filter(id => id !== area.id)
                                });
                              }
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`area-${area.id}`} className="ml-2 block text-sm text-gray-900">
                            {area.name}
                          </label>
                        </div>
                      ))}
                    {areas.filter(area =>
                      area.name.toLowerCase().includes(areaSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <p className="text-sm text-gray-500">該当するエリアが見つかりません</p>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    選択中: {formData.member_area_ids.length}件
                  </p>
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
                  {editingGroup ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {showDetailModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowDetailModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-2xl w-full mx-4 my-8">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {selectedGroup.display_name} の詳細
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700">グループID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedGroup.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700">表示名</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedGroup.display_name}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">ステータス</label>
                  <p className="mt-1">
                    {selectedGroup.is_major_terminal ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        主要ターミナル
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
                        通常
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">説明</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedGroup.description || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メンバーエリア ({selectedGroup.station_group_members?.length || 0}件)
                  </label>
                  <div className="border border-gray-200 rounded-md p-3 max-h-60 overflow-y-auto">
                    {selectedGroup.station_group_members && selectedGroup.station_group_members.length > 0 ? (
                      <ul className="space-y-1">
                        {selectedGroup.station_group_members.map((member) => (
                          <li key={member.id} className="text-sm text-gray-900">
                            • {getAreaName(member.station_id)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">メンバーエリアが設定されていません</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">作成日時</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedGroup.created_at).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}