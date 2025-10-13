'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
}

interface Review {
  id: string;
  title: string;
  content: string;
  rating: number;
  created_at: string;
  reviewer_nickname: string | null;
  reviewer_type: string;
  store: Store | null;
}

interface ReviewReport {
  id: string;
  review_id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_user_name: string | null;
  reason: string;
  detail: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  review: Review | null;
}

const REASON_LABELS: Record<string, string> = {
  spam: 'スパム',
  inappropriate: '不適切な内容',
  harassment: 'ハラスメント',
  false: '虚偽の情報',
  privacy: 'プライバシー侵害',
  self_deletion: '自己削除依頼',
  other: 'その他'
};

const STATUS_LABELS: Record<string, string> = {
  pending: '未対応',
  reviewing: '対応中',
  resolved: '解決済み',
  dismissed: '却下'
};

export default function ReviewReportsPage() {
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReviewReport[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReviewReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processAction, setProcessAction] = useState<'resolved' | 'dismissed' | 'reviewing'>('reviewing');
  const [resolutionNote, setResolutionNote] = useState('');
  const [deleteReview, setDeleteReview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, statusFilter]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDetailModal) {
          setShowDetailModal(false);
        }
        if (showProcessModal) {
          setShowProcessModal(false);
          resetProcessForm();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDetailModal, showProcessModal]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/review-reports');
      const { data, error } = await response.json();

      if (!response.ok) {
        throw new Error(error || 'Failed to fetch reports');
      }

      setReports(data || []);
    } catch (error) {
      console.error('Error fetching review reports:', error);
      alert('通報一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const filterReports = () => {
    if (statusFilter === 'all') {
      setFilteredReports(reports);
    } else {
      setFilteredReports(reports.filter(r => r.status === statusFilter));
    }
  };

  const handleViewDetail = (report: ReviewReport) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleProcessReport = (report: ReviewReport) => {
    setSelectedReport(report);
    setProcessAction(report.status === 'pending' ? 'reviewing' : report.status);
    setResolutionNote(report.resolution_note || '');
    setDeleteReview(false);
    setShowProcessModal(true);
  };

  const resetProcessForm = () => {
    setProcessAction('reviewing');
    setResolutionNote('');
    setDeleteReview(false);
  };

  const submitProcess = async () => {
    if (!selectedReport) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/review-reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedReport.id,
          status: processAction,
          resolution_note: resolutionNote,
          delete_review: deleteReview && processAction === 'resolved'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '処理に失敗しました');
      }

      alert(result.message);
      setShowProcessModal(false);
      resetProcessForm();
      fetchReports();
    } catch (error) {
      console.error('Error processing report:', error);
      alert(error instanceof Error ? error.message : '処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">口コミ通報管理</h1>
              <p className="mt-2 text-sm text-gray-600">
                ユーザーから報告された口コミを確認・処理します
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

        {/* ステータスフィルター */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">ステータス:</label>
            <div className="flex space-x-2">
              {['all', 'pending', 'reviewing', 'resolved', 'dismissed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? '全て' : STATUS_LABELS[status]}
                  {status === 'all' && ` (${reports.length})`}
                  {status !== 'all' && ` (${reports.filter(r => r.status === status).length})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 通報一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                通報一覧 ({filteredReports.length}件)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">通報日時</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">理由</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">店舗名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">口コミ投稿者</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">評価</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(report.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(report.status)}`}>
                          {STATUS_LABELS[report.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {REASON_LABELS[report.reason] || report.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.review?.store?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.reported_user_name || report.review?.reviewer_nickname || 'ゲスト'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.review?.rating ? `★${report.review.rating}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewDetail(report)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          詳細
                        </button>
                        <button
                          onClick={() => handleProcessReport(report)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          処理
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredReports.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  通報がありません
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 詳細モーダル */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowDetailModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-3xl w-full mx-4 my-8">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">通報詳細</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700">通報日時</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedReport.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700">ステータス</label>
                    <p className="mt-1">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(selectedReport.status)}`}>
                        {STATUS_LABELS[selectedReport.status]}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">通報理由</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {REASON_LABELS[selectedReport.reason] || selectedReport.reason}
                  </p>
                </div>

                {selectedReport.detail && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700">詳細</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedReport.detail}
                    </p>
                  </div>
                )}

                <hr className="my-4" />

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">対象の口コミ</label>
                  {selectedReport.review ? (
                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                      <div className="mb-2">
                        <span className="text-sm font-bold text-gray-700">店舗:</span>{' '}
                        <span className="text-sm text-gray-900">{selectedReport.review.store?.name || '-'}</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-sm font-bold text-gray-700">投稿者:</span>{' '}
                        <span className="text-sm text-gray-900">
                          {selectedReport.reported_user_name || selectedReport.review.reviewer_nickname || 'ゲスト'}
                        </span>
                      </div>
                      <div className="mb-2">
                        <span className="text-sm font-bold text-gray-700">評価:</span>{' '}
                        <span className="text-sm text-gray-900">★{selectedReport.review.rating}</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-sm font-bold text-gray-700">タイトル:</span>{' '}
                        <span className="text-sm text-gray-900">{selectedReport.review.title}</span>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-700">内容:</span>
                        <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                          {selectedReport.review.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">口コミが削除されています</p>
                  )}
                </div>

                {selectedReport.resolution_note && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700">対応メモ</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedReport.resolution_note}
                    </p>
                  </div>
                )}

                {selectedReport.resolved_at && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700">解決日時</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedReport.resolved_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  閉じる
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleProcessReport(selectedReport);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  処理する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 処理モーダル */}
      {showProcessModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => { setShowProcessModal(false); resetProcessForm(); }}></div>
          <div className="relative bg-white rounded-lg max-w-2xl w-full mx-4 my-8">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">通報処理</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">処理アクション</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="reviewing"
                        checked={processAction === 'reviewing'}
                        onChange={(e) => setProcessAction(e.target.value as 'reviewing')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-900">対応中にする</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="resolved"
                        checked={processAction === 'resolved'}
                        onChange={(e) => setProcessAction(e.target.value as 'resolved')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-900">承認（通報内容が適切）</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="dismissed"
                        checked={processAction === 'dismissed'}
                        onChange={(e) => setProcessAction(e.target.value as 'dismissed')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-900">却下（通報内容が不適切）</span>
                    </label>
                  </div>
                </div>

                {processAction === 'resolved' && selectedReport.review && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="delete_review"
                      checked={deleteReview}
                      onChange={(e) => setDeleteReview(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="delete_review" className="ml-2 block text-sm text-gray-900">
                      口コミを削除する
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700">対応メモ</label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={4}
                    placeholder="対応内容や理由を記録"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowProcessModal(false);
                    resetProcessForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={isProcessing}
                >
                  キャンセル
                </button>
                <button
                  onClick={submitProcess}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                  disabled={isProcessing}
                >
                  {isProcessing ? '処理中...' : '処理を確定'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
