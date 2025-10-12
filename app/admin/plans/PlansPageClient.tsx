'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { SubscriptionPlan, SubscriptionPlanInput } from '@/types/subscription-plan';
import { PRIORITY_COLORS } from '@/types/subscription-plan';

export default function PlansPageClient() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // フォームの状態
  const [formData, setFormData] = useState<SubscriptionPlanInput>({
    name: '',
    display_name: '',
    price: 0,
    description: '',
    features: {},
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/plans');
      const data = await response.json();

      if (response.ok) {
        setPlans(data.plans);
      } else {
        alert('プランの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      alert('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      display_name: '',
      price: 0,
      description: '',
      features: {},
      display_order: plans.length + 1,
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      display_name: plan.display_name,
      price: plan.price,
      description: plan.description || '',
      features: plan.features,
      display_order: plan.display_order,
      is_active: plan.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = '/api/plans';
      const method = editingPlan ? 'PUT' : 'POST';
      const body = editingPlan
        ? { id: editingPlan.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        alert(editingPlan ? 'プランを更新しました' : 'プランを作成しました');
        setShowModal(false);
        fetchPlans();
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!confirm(`「${plan.display_name}」を削除しますか？\nこのプランを使用している店舗がある場合は削除できません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/plans?id=${plan.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert('プランを削除しました');
        fetchPlans();
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('エラーが発生しました');
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      const response = await fetch('/api/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan.id,
          is_active: !plan.is_active,
        }),
      });

      if (response.ok) {
        fetchPlans();
      } else {
        alert('エラーが発生しました');
      }
    } catch (error) {
      console.error('Error toggling plan:', error);
      alert('エラーが発生しました');
    }
  };

  const getPriorityColor = (plan: SubscriptionPlan) => {
    const priorityDisplay = plan.features?.priority_display as string;
    if (!priorityDisplay || !(priorityDisplay in PRIORITY_COLORS)) {
      return null;
    }
    return PRIORITY_COLORS[priorityDisplay as keyof typeof PRIORITY_COLORS];
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
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">プラン管理</h1>
              <p className="mt-1 text-sm text-gray-600">料金プランの作成・編集・管理</p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                ダッシュボードに戻る
              </Link>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                新規プラン作成
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* プラン一覧 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {plans.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">プランが登録されていません</p>
            <button
              onClick={handleCreate}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              最初のプランを作成
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const priorityColor = getPriorityColor(plan);

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden ${
                    !plan.is_active ? 'opacity-60' : ''
                  }`}
                >
                  {/* プランヘッダー */}
                  <div className={`p-6 ${priorityColor ? priorityColor.bg : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`text-2xl font-bold ${priorityColor ? priorityColor.text : 'text-gray-900'}`}>
                        {plan.display_name}
                      </h3>
                      {!plan.is_active && (
                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                          無効
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">({plan.name})</p>
                    <div className="text-3xl font-bold text-gray-900">
                      ¥{plan.price.toLocaleString()}
                      <span className="text-sm font-normal text-gray-600">/月</span>
                    </div>
                  </div>

                  {/* プラン詳細 */}
                  <div className="p-6">
                    {plan.description && (
                      <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                    )}

                    {/* 機能リスト */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">主な機能</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {plan.features?.photos && (
                          <li>• 写真{plan.features.photos}枚まで</li>
                        )}
                        {plan.features?.edit_access && (
                          <li>• 管理画面編集権限</li>
                        )}
                        {priorityColor && (
                          <li>• 上位表示（{priorityColor.label}）</li>
                        )}
                        {plan.features?.review_pickup && (
                          <li>• 口コミピックアップ</li>
                        )}
                        {plan.features?.weekly_message && (
                          <li>• 一斉メッセージ（週{plan.features.weekly_message}回）</li>
                        )}
                        {plan.features?.concierge && (
                          <li>• コンシェルジュプラン</li>
                        )}
                      </ul>
                    </div>

                    <div className="text-xs text-gray-500 mb-4">
                      表示順: {plan.display_order}
                    </div>

                    {/* アクションボタン */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleToggleActive(plan)}
                        className={`flex-1 px-3 py-2 text-sm rounded-md ${
                          plan.is_active
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {plan.is_active ? '無効化' : '有効化'}
                      </button>
                      <button
                        onClick={() => handleDelete(plan)}
                        className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* プラン作成・編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingPlan ? 'プラン編集' : '新規プラン作成'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      プラン名（システム内部用）<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                      placeholder="例: premium5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      表示名<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                      placeholder="例: プレミアム５"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      月額料金（円）<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      表示順
                    </label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    プラン説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="プランの概要を入力してください"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    有効にする
                  </label>
                </div>

                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-600">
                    <strong>注意:</strong> 機能詳細（features）はJSON形式で管理されています。
                    詳細な編集が必要な場合は、データベースから直接編集してください。
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isSaving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
