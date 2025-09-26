'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Store {
  id: string;
  name: string;
  area_id?: string;
  genre_id?: string;
  description?: string;
  address?: string;
  phone_number?: string;
  business_hours?: string;
  regular_holiday?: string;
  thumbnail_url?: string;
  images?: string[];
  is_active: boolean;
  owner_id?: string;
  email?: string;
  secondary_phone?: string;
  line_id?: string;
  minimum_hourly_wage?: number;
  maximum_hourly_wage?: number;
  recruitment_status?: 'active' | 'paused' | 'closed';
  recruitment_message?: string;
  store_features?: string[];
  created_at: string;
  updated_at: string;
}

interface StoreEditRequest {
  id: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  applicant_role: string;
  business_license: string | null;
  additional_info: string | null;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  // Document verification fields
  document_type?: 'restaurant_license' | 'late_night_license' | 'corporate_registry' | 'identity_document';
  business_license_image?: string;
  additional_document_type?: 'late_night_license' | 'corporate_registry' | 'identity_document';
  additional_document_image?: string;
  identity_document_image?: string;
  license_holder_name?: string;
  applicant_relationship?: 'owner' | 'manager' | 'employee' | 'representative';
  document_verification_status?: 'pending' | 'verified' | 'rejected';
  verification_notes?: string;
  business_type?: 'girls_bar' | 'snack' | 'concept_cafe' | 'other';
  store_id?: string;
  related_store?: Store;
  token?: string;
  generated_url?: string;
  token?: string;
}

export default function AdminRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<StoreEditRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<StoreEditRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<StoreEditRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [selectedUrlRequest, setSelectedUrlRequest] = useState<StoreEditRequest | null>(null);
  const [copySuccess, setCopySuccess] = useState<string>('');

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, statusFilter]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
        setSelectedRequest(null);
        setAdminNotes('');
        setRejectionReason('');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal]);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/requests');
      const { data, error } = await response.json();

      if (!response.ok) {
        throw new Error(error || 'Failed to fetch requests');
      }

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterRequests = () => {
    if (statusFilter === 'all') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(r => r.status === statusFilter));
    }
  };

  const generateToken = () => {
    // UUID形式のトークンを生成
    const token = crypto.randomUUID();
    return token;
  };

  const handleApprove = async (request: StoreEditRequest) => {
    try {
      const response = await fetch('/api/requests/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          adminNotes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve request');
      }

      const { token, url } = result.data;
      setGeneratedToken(token);
      setGeneratedUrl(url);

      // 成功メッセージを表示
      alert(`承認しました！\n\n編集URL: ${url}\n\nこのURLを申請者にメールで送信してください。`);

      setShowModal(false);
      setSelectedRequest(null);
      setAdminNotes('');

      // リストを更新
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('承認処理中にエラーが発生しました');
    }
  };

  const handleCancelApproval = async (request: StoreEditRequest) => {
    try {
      const response = await fetch('/api/requests/cancel-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          reason: '管理者により承認が取り消されました',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel approval');
      }

      alert('承認を取り消しました');
      setShowModal(false);
      fetchRequests(); // リストを更新
    } catch (error) {
      console.error('Error canceling approval:', error);
      alert('承認取り消し中にエラーが発生しました');
    }
  };

  const handleReject = async (request: StoreEditRequest) => {
    if (!rejectionReason) {
      alert('却下理由を入力してください');
      return;
    }

    try {
      const response = await fetch('/api/requests/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          rejectionReason,
          adminNotes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject request');
      }

      fetchRequests();
      alert('申請を却下しました');
      setShowModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setAdminNotes('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('却下処理中にエラーが発生しました');
    }
  };

  // 店舗マッチング機能
  const handleStoreMatch = async (request: StoreEditRequest) => {
    setIsMatching(true);
    try {
      const response = await fetch(`/api/requests/${request.id}/match-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to match store');
      }

      if (result.success) {
        alert(`店舗マッチング成功: ${result.matched_store?.name || '店舗名不明'}`);
        fetchRequests(); // リストを更新
      } else {
        alert(result.message || 'マッチする店舗が見つかりませんでした');
      }
    } catch (error) {
      console.error('Error matching store:', error);
      alert('店舗マッチング中にエラーが発生しました');
    } finally {
      setIsMatching(false);
    }
  };

  // 比較表示を開く
  const openComparisonModal = (request: StoreEditRequest) => {
    setSelectedRequest(request);
    setShowComparisonModal(true);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: '未処理',
      reviewing: '確認中',
      approved: '承認済',
      rejected: '却下'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getVerificationBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: '未確認',
      verified: '確認済',
      rejected: '不備あり'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || '未確認'}
      </span>
    );
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels = {
      restaurant_license: '飲食店営業許可証',
      late_night_license: '深夜酒類提供飲食店営業届出',
      corporate_registry: '法人登記簿謄本',
      identity_document: '身分証明書'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getBusinessTypeLabel = (type: string) => {
    const labels = {
      girls_bar: 'ガールズバー',
      snack: 'スナック',
      concept_cafe: 'コンセプトカフェ',
      other: 'その他'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleVerificationUpdate = async (requestId: string, status: 'verified' | 'rejected', notes: string) => {
    try {
      const response = await fetch('/api/requests/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          verificationStatus: status,
          verificationNotes: notes
        }),
      });

      if (!response.ok) {
        throw new Error('書類確認の更新に失敗しました');
      }

      alert('書類確認ステータスを更新しました');
      fetchRequests();
    } catch (error) {
      console.error('Error updating verification:', error);
      alert('エラーが発生しました');
    }
  };

  // URLをクリップボードにコピー
  const copyToClipboard = async (url: string, requestId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(requestId);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('コピーに失敗しました');
    }
  };

  // URL詳細モーダルを開く
  const openUrlModal = (request: StoreEditRequest) => {
    setSelectedUrlRequest(request);
    setShowUrlModal(true);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">申請管理</h1>
              <p className="text-sm text-gray-600">店舗編集URL申請の管理</p>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              ダッシュボードへ戻る
            </button>
          </div>
        </div>
      </header>

      {/* フィルタ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">ステータス:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">すべて</option>
              <option value="pending">未処理</option>
              <option value="reviewing">確認中</option>
              <option value="approved">承認済</option>
              <option value="rejected">却下</option>
            </select>
            <div className="ml-auto text-sm text-gray-600">
              {filteredRequests.length}件の申請
            </div>
          </div>
        </div>
      </div>

      {/* 申請一覧 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申請日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  店舗名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  業態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申請者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  書類確認
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  店舗連携
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  発行URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(request.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{request.store_name}</div>
                    <div className="text-sm text-gray-500">{request.store_address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getBusinessTypeLabel(request.business_type || 'other')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.applicant_name}</div>
                    <div className="text-sm text-gray-500">{request.applicant_role}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getVerificationBadge(request.document_verification_status || 'pending')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {request.store_id ? (
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <span className="text-green-600 text-xs">✓ 連携済み</span>
                        </div>
                        <button
                          onClick={() => openComparisonModal(request)}
                          className="text-blue-600 hover:text-blue-900 text-xs"
                        >
                          比較表示
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStoreMatch(request)}
                        disabled={isMatching}
                        className="text-yellow-600 hover:text-yellow-900 text-xs disabled:opacity-50"
                      >
                        {isMatching ? '検索中...' : '店舗検索'}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {request.status === 'approved' && request.generated_url ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(request.generated_url!, request.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="URLをコピー"
                        >
                          {copySuccess === request.id ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => openUrlModal(request)}
                          className="text-indigo-600 hover:text-indigo-900 text-xs"
                        >
                          詳細
                        </button>
                        <button
                          onClick={() => router.push(`/admin/tokens/${request.id}`)}
                          className="text-purple-600 hover:text-purple-900 text-xs"
                        >
                          管理
                        </button>
                      </div>
                    ) : request.status === 'approved' ? (
                      <span className="text-gray-400 text-xs">URL未生成</span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      詳細
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 詳細モーダル */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">申請詳細</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">店舗名</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.store_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">業態</label>
                    <p className="mt-1 text-sm text-gray-900">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getBusinessTypeLabel(selectedRequest.business_type || 'other')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">電話番号</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.store_phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">住所</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.store_address}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">申請者名</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.applicant_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">役職</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.applicant_role}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.applicant_email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">電話番号</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.applicant_phone}</p>
                    </div>
                  </div>
                </div>

                {/* 書類情報セクション */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">提出書類</h3>

                  {/* 許可証名義人情報 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">許可証名義人</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.license_holder_name || selectedRequest.applicant_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">申請者との関係</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedRequest.applicant_relationship === 'owner' ? '所有者' :
                         selectedRequest.applicant_relationship === 'manager' ? '管理者' :
                         selectedRequest.applicant_relationship === 'employee' ? '従業員' :
                         selectedRequest.applicant_relationship === 'representative' ? '代理人' : '未設定'}
                      </p>
                    </div>
                  </div>

                  {/* 飲食店営業許可証 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">飲食店営業許可証（必須）</label>
                    {selectedRequest.business_license_image ? (
                      <div className="flex items-center space-x-4">
                        {selectedRequest.business_license_image.toLowerCase().endsWith('.pdf') ? (
                          <div className="flex items-center space-x-2 p-3 border rounded bg-gray-50">
                            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">PDFファイル</p>
                              <a href={selectedRequest.business_license_image} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                ファイルを開く
                              </a>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={selectedRequest.business_license_image}
                            alt="飲食店営業許可証"
                            className="w-24 h-24 object-cover border rounded cursor-pointer hover:opacity-80"
                            onClick={() => handleImageClick(selectedRequest.business_license_image!)}
                          />
                        )}
                        <div>
                          <p className="text-sm text-gray-600">
                            {selectedRequest.business_license_image.toLowerCase().endsWith('.pdf') ? 'PDFファイル' : 'クリックで拡大表示'}
                          </p>
                          {selectedRequest.business_license && (
                            <p className="text-xs text-gray-500">許可証番号: {selectedRequest.business_license}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">画像がアップロードされていません</p>
                    )}
                  </div>

                  {/* 追加書類 */}
                  {selectedRequest.additional_document_image && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {getDocumentTypeLabel(selectedRequest.additional_document_type || '')}
                      </label>
                      <div className="flex items-center space-x-4">
                        {selectedRequest.additional_document_image!.toLowerCase().endsWith('.pdf') ? (
                          <div className="flex items-center space-x-2 p-3 border rounded bg-gray-50">
                            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">PDFファイル</p>
                              <a href={selectedRequest.additional_document_image} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                ファイルを開く
                              </a>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={selectedRequest.additional_document_image}
                            alt={getDocumentTypeLabel(selectedRequest.additional_document_type || '')}
                            className="w-24 h-24 object-cover border rounded cursor-pointer hover:opacity-80"
                            onClick={() => handleImageClick(selectedRequest.additional_document_image!)}
                          />
                        )}
                        <p className="text-sm text-gray-600">
                          {selectedRequest.additional_document_image!.toLowerCase().endsWith('.pdf') ? 'PDFファイル' : 'クリックで拡大表示'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 身分証明書 */}
                  {selectedRequest.identity_document_image && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">身分証明書</label>
                      <div className="flex items-center space-x-4">
                        {selectedRequest.identity_document_image!.toLowerCase().endsWith('.pdf') ? (
                          <div className="flex items-center space-x-2 p-3 border rounded bg-gray-50">
                            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">PDFファイル</p>
                              <a href={selectedRequest.identity_document_image} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                ファイルを開く
                              </a>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={selectedRequest.identity_document_image}
                            alt="身分証明書"
                            className="w-24 h-24 object-cover border rounded cursor-pointer hover:opacity-80"
                            onClick={() => handleImageClick(selectedRequest.identity_document_image!)}
                          />
                        )}
                        <p className="text-sm text-gray-600">
                          {selectedRequest.identity_document_image!.toLowerCase().endsWith('.pdf') ? 'PDFファイル' : 'クリックで拡大表示'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 書類確認ステータス */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">書類確認ステータス</label>
                    <div className="flex items-center space-x-4">
                      {getVerificationBadge(selectedRequest.document_verification_status || 'pending')}
                      {selectedRequest.document_verification_status === 'pending' && (
                        <div className="space-x-2">
                          <button
                            onClick={() => handleVerificationUpdate(selectedRequest.id, 'verified', '書類に問題なし')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            確認完了
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('不備理由を入力してください');
                              if (notes) {
                                handleVerificationUpdate(selectedRequest.id, 'rejected', notes);
                              }
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            不備あり
                          </button>
                        </div>
                      )}
                    </div>
                    {selectedRequest.verification_notes && (
                      <p className="mt-2 text-sm text-gray-600">確認メモ: {selectedRequest.verification_notes}</p>
                    )}
                  </div>
                </div>

                {selectedRequest.additional_info && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">補足事項</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.additional_info}</p>
                  </div>
                )}

                {selectedRequest.status === 'pending' && (
                  <>
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700">管理者メモ</label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={3}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="管理用のメモ（申請者には表示されません）"
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('却下理由を入力してください');
                          if (reason) {
                            setRejectionReason(reason);
                            handleReject(selectedRequest);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        却下
                      </button>
                      <button
                        onClick={() => handleApprove(selectedRequest)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        承認・URL発行
                      </button>
                    </div>
                  </>
                )}

                {selectedRequest.status === 'approved' && (
                  <>
                    <h3 className="text-lg font-semibold mb-3 mt-6">承認済みアクション</h3>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            承認を取り消すと、発行されたURLが無効になり、店舗側は編集できなくなります。
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('本当に承認を取り消しますか？\n発行されたURLは無効になります。')) {
                          handleCancelApproval(selectedRequest);
                        }
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                    >
                      承認を取り消す
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 比較表示モーダル */}
      {showComparisonModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowComparisonModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-7xl w-full mx-4 max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">申請内容と店舗情報の比較</h2>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左側: 申請内容 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-blue-800">📝 申請内容</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">店舗名</label>
                      <p className="text-sm text-gray-900">{selectedRequest.store_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">住所</label>
                      <p className="text-sm text-gray-900">{selectedRequest.store_address}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">電話番号</label>
                      <p className="text-sm text-gray-900">{selectedRequest.store_phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">業態</label>
                      <p className="text-sm text-gray-900">{getBusinessTypeLabel(selectedRequest.business_type || 'restaurant')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">申請者</label>
                      <p className="text-sm text-gray-900">{selectedRequest.applicant_name} ({selectedRequest.applicant_role})</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">申請者メール</label>
                      <p className="text-sm text-gray-900">{selectedRequest.applicant_email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">申請者電話</label>
                      <p className="text-sm text-gray-900">{selectedRequest.applicant_phone}</p>
                    </div>
                    {selectedRequest.additional_info && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">追加情報</label>
                        <p className="text-sm text-gray-900">{selectedRequest.additional_info}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 右側: 既存店舗情報 */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-green-800">🏪 既存店舗情報</h3>
                  {selectedRequest.related_store ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">店舗名</label>
                        <p className="text-sm text-gray-900">{selectedRequest.related_store.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">住所</label>
                        <p className="text-sm text-gray-900">{selectedRequest.related_store.address || '未設定'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">電話番号</label>
                        <p className="text-sm text-gray-900">{selectedRequest.related_store.phone_number || '未設定'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">営業時間</label>
                        <p className="text-sm text-gray-900">{selectedRequest.related_store.business_hours || '未設定'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">定休日</label>
                        <p className="text-sm text-gray-900">{selectedRequest.related_store.regular_holiday || '未設定'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">店舗メール</label>
                        <p className="text-sm text-gray-900">{selectedRequest.related_store.email || '未設定'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ステータス</label>
                        <p className="text-sm text-gray-900">{selectedRequest.related_store.is_active ? '✅ アクティブ' : '❌ 非アクティブ'}</p>
                      </div>
                      {selectedRequest.related_store.description && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">店舗説明</label>
                          <p className="text-sm text-gray-900">{selectedRequest.related_store.description}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">関連する店舗情報が見つかりません</p>
                      <button
                        onClick={() => handleStoreMatch(selectedRequest)}
                        disabled={isMatching}
                        className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
                      >
                        {isMatching ? '検索中...' : '店舗を検索'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* URL詳細モーダル */}
      {showUrlModal && selectedUrlRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowUrlModal(false)}></div>
          <div className="relative bg-white rounded-lg max-w-2xl w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">編集URL詳細</h2>
              <button
                onClick={() => setShowUrlModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">店舗名</label>
                <p className="text-sm text-gray-900">{selectedUrlRequest.store_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">発行日時</label>
                <p className="text-sm text-gray-900">
                  {selectedUrlRequest.reviewed_at ?
                    new Date(selectedUrlRequest.reviewed_at).toLocaleString('ja-JP') :
                    '未発行'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">編集URL</label>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-900 break-all font-mono">
                    {selectedUrlRequest.generated_url || 'URLが生成されていません'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">トークン</label>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-900 break-all font-mono">
                    {selectedUrlRequest.token || 'トークンが生成されていません'}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-3">
                  {selectedUrlRequest.generated_url && (
                    <button
                      onClick={() => copyToClipboard(selectedUrlRequest.generated_url!, 'modal')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
                    >
                      {copySuccess === 'modal' ? (
                        <>
                          <span>✓</span>
                          <span>コピー済み</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span>URLをコピー</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowUrlModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 画像拡大表示モーダル */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-4xl max-h-[90vh] mx-4">
            <button
              onClick={() => {
                setShowImageModal(false);
                setSelectedImage('');
              }}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedImage}
              alt="書類画像"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={() => {
                setShowImageModal(false);
                setSelectedImage('');
              }}
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded text-center">
              <p className="text-sm">クリックで閉じる</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}