'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';


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
  station?: string;
  station_line?: string;
  station_distance?: string;
  google_place_id?: string;
  google_maps_uri?: string;
  latitude?: number;
  longitude?: number;
  price_level?: string;
  website?: string;
  rating?: number;
  review_count?: number;
  area?: string;
  features?: string[];
  genre?: string;
  opening_hours_text?: string[];
  tags?: string[];
  view_count?: number;
  owner_id?: string;
  email?: string;
  line_id?: string;
  minimum_hourly_wage?: number;
  maximum_hourly_wage?: number;
  average_daily_income?: number;
  average_monthly_income?: number;
  work_system?: string;
  recruitment_status?: 'active' | 'paused' | 'closed';
  treatment_benefits?: string;
  working_conditions?: string;
  dress_code?: string;
  target_age_min?: number;
  target_age_max?: number;
  recruitment_message?: string;
  store_features?: string[];
  payment_system?: string;
  back_rate?: string;
  dormitory_available?: boolean;
  dormitory_details?: string;
  daycare_available?: boolean;
  daycare_details?: string;
  trial_period?: string;
  trial_conditions?: string;
  interview_location?: string;
  interview_flow?: string;
  sns_instagram?: string;
  sns_twitter?: string;
  sns_tiktok?: string;
  last_updated_by?: string;
  favorite_count?: number;
  application_count?: number;
  plan_type?: 'free' | 'basic' | 'premium' | 'enterprise';
  plan_expires_at?: string;
  max_images_allowed?: number;
  verified_at?: string;
  verified_by?: string;
  custom_notes?: string;
  image_url?: string;
  additional_images?: string[];
  accessible_stations?: any;
  // 営業時間の詳細カラム
  hours_monday_open?: string;
  hours_monday_close?: string;
  hours_monday_closed?: boolean;
  hours_tuesday_open?: string;
  hours_tuesday_close?: string;
  hours_tuesday_closed?: boolean;
  hours_wednesday_open?: string;
  hours_wednesday_close?: string;
  hours_wednesday_closed?: boolean;
  hours_thursday_open?: string;
  hours_thursday_close?: string;
  hours_thursday_closed?: boolean;
  hours_friday_open?: string;
  hours_friday_close?: string;
  hours_friday_closed?: boolean;
  hours_saturday_open?: string;
  hours_saturday_close?: string;
  hours_saturday_closed?: boolean;
  hours_sunday_open?: string;
  hours_sunday_close?: string;
  hours_sunday_closed?: boolean;
}

export default function OwnerEditPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [requireAuth, setRequireAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // メッセージ配信用の状態
  const [favoriteUsers, setFavoriteUsers] = useState<any[]>([]);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState('notification');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageHistory, setMessageHistory] = useState<any[]>([]);

  // フォームデータ
  const [formData, setFormData] = useState<Partial<Store>>({
    // デフォルトの営業時間
    hours_monday_open: '11:00',
    hours_monday_close: '23:00',
    hours_monday_closed: false,
    hours_tuesday_open: '11:00',
    hours_tuesday_close: '23:00',
    hours_tuesday_closed: false,
    hours_wednesday_open: '11:00',
    hours_wednesday_close: '23:00',
    hours_wednesday_closed: false,
    hours_thursday_open: '11:00',
    hours_thursday_close: '23:00',
    hours_thursday_closed: false,
    hours_friday_open: '11:00',
    hours_friday_close: '23:00',
    hours_friday_closed: false,
    hours_saturday_open: '11:00',
    hours_saturday_close: '23:00',
    hours_saturday_closed: false,
    hours_sunday_open: '11:00',
    hours_sunday_close: '23:00',
    hours_sunday_closed: false,
  });

  // マスターデータ
  const [masterData, setMasterData] = useState<{
    genres: Array<{ id: string; name: string }>;
    stations: Array<{ id: string; name: string; railway_lines: string[] }>;
    railwayLines: string[];
  }>({ genres: [], stations: [], railwayLines: [] });

  // 駅・路線サジェスト
  const [stationSuggestions, setStationSuggestions] = useState<Array<{ id: string; name: string; railway_lines: string[] }>>([]);
  const [showStationSuggestions, setShowStationSuggestions] = useState(false);
  const [railwaySuggestions, setRailwaySuggestions] = useState<string[]>([]);
  const [showRailwaySuggestions, setShowRailwaySuggestions] = useState(false);

  // 画像アップロード
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState<(File | null)[]>([null, null, null]);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<(string | null)[]>([null, null, null]);

  useEffect(() => {
    checkAuthAndValidateToken();
  }, [token]);

  const checkAuthAndValidateToken = async () => {
    try {
      // まず認証状態を確認
      const authResponse = await fetch(`/api/owner/check-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const authData = await authResponse.json();

      if (!authResponse.ok) {
        console.error('Auth check failed:', authData.error || authData.message);
        setIsValidToken(false);
        setIsLoading(false);
        return;
      }

      setRequireAuth(authData.requireAuth);

      // 認証が必要で、認証されていない場合
      if (authData.requireAuth && !authData.authenticated) {
        console.log('Authentication required, redirecting to auth page');
        router.push(`/owner/auth/${token}`);
        return;
      }

      setIsAuthenticated(authData.authenticated);

      // トークンの検証と店舗情報の取得
      await validateTokenAndFetchStore();
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsValidToken(false);
      setIsLoading(false);
    }
  };

  const validateTokenAndFetchStore = async () => {
    try {
      console.log('Validating token:', token);
      const response = await fetch(`/api/owner/validate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      console.log('Validation response:', response.status, data);

      if (!response.ok) {
        console.error('Token validation failed:', data.error || data.message);
        throw new Error(data.error || 'Invalid token');
      }

      const { store: storeData } = data;

      // トークンが有効なので、フラグを設定
      setIsValidToken(true);

      // マスターデータ取得
      const masterResponse = await fetch('/api/owner/master-data');
      const masterDataResult = await masterResponse.json();

      if (masterResponse.ok) {
        setMasterData(masterDataResult);
      }

      if (storeData) {
        setStore(storeData);
        // デフォルトの営業時間を設定（データベースにない場合）
        const formDataWithDefaults = {
          ...storeData,
          hours_monday_open: storeData.hours_monday_open || '11:00',
          hours_monday_close: storeData.hours_monday_close || '23:00',
          hours_monday_closed: storeData.hours_monday_closed || false,
          hours_tuesday_open: storeData.hours_tuesday_open || '11:00',
          hours_tuesday_close: storeData.hours_tuesday_close || '23:00',
          hours_tuesday_closed: storeData.hours_tuesday_closed || false,
          hours_wednesday_open: storeData.hours_wednesday_open || '11:00',
          hours_wednesday_close: storeData.hours_wednesday_close || '23:00',
          hours_wednesday_closed: storeData.hours_wednesday_closed || false,
          hours_thursday_open: storeData.hours_thursday_open || '11:00',
          hours_thursday_close: storeData.hours_thursday_close || '23:00',
          hours_thursday_closed: storeData.hours_thursday_closed || false,
          hours_friday_open: storeData.hours_friday_open || '11:00',
          hours_friday_close: storeData.hours_friday_close || '23:00',
          hours_friday_closed: storeData.hours_friday_closed || false,
          hours_saturday_open: storeData.hours_saturday_open || '11:00',
          hours_saturday_close: storeData.hours_saturday_close || '23:00',
          hours_saturday_closed: storeData.hours_saturday_closed || false,
          hours_sunday_open: storeData.hours_sunday_open || '11:00',
          hours_sunday_close: storeData.hours_sunday_close || '23:00',
          hours_sunday_closed: storeData.hours_sunday_closed || false,
        };
        setFormData(formDataWithDefaults);

        // お気に入り登録ユーザーとメッセージ履歴を取得
        if (storeData.id) {
          fetchFavoriteUsers(storeData.id);
          fetchMessageHistory(storeData.id);
        }

        // 既存の画像がある場合はプレビューに設定
        if (storeData.image_url) {
          setMainImagePreview(storeData.image_url);
        }
        if (storeData.additional_images) {
          setAdditionalImagePreviews([
            storeData.additional_images[0] || null,
            storeData.additional_images[1] || null,
            storeData.additional_images[2] || null
          ]);
        }
      } else {
        // 新規店舗の場合、デフォルト値を設定
        console.log('New store - setting default values');
      }
    } catch (error) {
      console.error('Error validating token:', error);
      setIsValidToken(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value ? Number(value) : null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // 駅名入力時のサジェスト表示
    if (name === 'station') {
      if (value.length > 0) {
        const filtered = masterData.stations.filter(station =>
          station.name.toLowerCase().includes(value.toLowerCase())
        );
        setStationSuggestions(filtered.slice(0, 5));
        setShowStationSuggestions(true);
      } else {
        setShowStationSuggestions(false);
      }
    }

    // 路線入力時のサジェスト表示
    if (name === 'station_line') {
      if (value.length > 0) {
        const filtered = masterData.railwayLines.filter(line =>
          line.toLowerCase().includes(value.toLowerCase())
        );
        setRailwaySuggestions(filtered.slice(0, 5));
        setShowRailwaySuggestions(true);
      } else {
        setShowRailwaySuggestions(false);
      }
    }
  };

  const handleStationSelect = (station: { id: string; name: string; railway_lines: string[] }, selectedLine?: string) => {
    setFormData(prev => ({
      ...prev,
      station: station.name,
      station_line: selectedLine || station.railway_lines[0] || prev.station_line
    }));
    setShowStationSuggestions(false);
  };

  const handleRailwaySelect = (line: string) => {
    setFormData(prev => ({ ...prev, station_line: line }));
    setShowRailwaySuggestions(false);
  };


  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMainImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newFiles = [...additionalImageFiles];
      newFiles[index] = file;
      setAdditionalImageFiles(newFiles);

      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...additionalImagePreviews];
        newPreviews[index] = reader.result as string;
        setAdditionalImagePreviews(newPreviews);
      };
      reader.readAsDataURL(file);
    }
  };

  // お気に入り登録ユーザーを取得
  const fetchFavoriteUsers = async (storeId: string) => {
    try {
      const response = await fetch(
        `/api/owner/favorite-users?storeId=${storeId}&token=${token}`
      );
      if (response.ok) {
        const data = await response.json();
        setFavoriteUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching favorite users:', error);
    }
  };

  // メッセージ送信履歴を取得
  const fetchMessageHistory = async (storeId: string) => {
    try {
      const response = await fetch(
        `/api/owner/send-message?storeId=${storeId}&token=${token}`
      );
      if (response.ok) {
        const data = await response.json();
        setMessageHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching message history:', error);
    }
  };

  // メッセージを取り消し
  const handleCancelMessage = async (broadcastId: string, title: string) => {
    if (!store?.id) {
      alert('店舗情報が読み込まれていません');
      return;
    }

    const reason = window.prompt(`「${title}」を取り消す理由を入力してください（任意）`);
    if (reason === null) {
      return; // キャンセルボタンが押された
    }

    try {
      const response = await fetch('/api/owner/cancel-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broadcastId,
          storeId: store.id,
          token,
          reason: reason || undefined
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`メッセージを取り消しました（影響を受けたユーザー数: ${data.affected_users}人）`);
        // 履歴を更新
        if (store?.id) {
          fetchMessageHistory(store.id);
        }
      } else {
        alert(data.error || 'メッセージの取り消しに失敗しました');
      }
    } catch (error) {
      console.error('Error cancelling message:', error);
      alert('メッセージの取り消しに失敗しました');
    }
  };

  // メッセージを送信
  const handleSendMessage = async () => {
    if (!store?.id) {
      alert('店舗情報が読み込まれていません');
      return;
    }

    if (!messageTitle.trim() || !messageContent.trim()) {
      alert('タイトルと本文を入力してください');
      return;
    }

    if (favoriteUsers.length === 0) {
      alert('お気に入り登録しているユーザーがいません');
      return;
    }

    if (!window.confirm(
      `${favoriteUsers.length}人のユーザーにメッセージを送信します。よろしいですか？`
    )) {
      return;
    }

    setIsSendingMessage(true);
    try {
      const response = await fetch('/api/owner/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: store?.id,
          token,
          title: messageTitle,
          content: messageContent,
          messageType
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`メッセージを${data.recipient_count}人に送信しました`);
        setMessageTitle('');
        setMessageContent('');
        // store.idが存在する場合のみ履歴を更新
        if (store?.id) {
          fetchMessageHistory(store.id);
        }
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('メッセージの送信に失敗しました');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let updatedFormData = { ...formData };

      // メイン画像のアップロード
      if (mainImageFile) {
        const formDataImg = new FormData();
        formDataImg.append('file', mainImageFile);
        formDataImg.append('type', 'main');
        formDataImg.append('storeId', store?.id || 'new');

        const uploadResponse = await fetch('/api/owner/upload-image', {
          method: 'POST',
          body: formDataImg,
        });

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          updatedFormData.image_url = url;
        } else {
          console.error('メイン画像のアップロードに失敗しました');
        }
      }

      // 追加画像のアップロード
      const uploadedAdditionalImages: string[] = [...(formData.additional_images || [])];
      for (let i = 0; i < additionalImageFiles.length; i++) {
        if (additionalImageFiles[i]) {
          const formDataImg = new FormData();
          formDataImg.append('file', additionalImageFiles[i]!);
          formDataImg.append('type', `additional_${i}`);
          formDataImg.append('storeId', store?.id || 'new');

          const uploadResponse = await fetch('/api/owner/upload-image', {
            method: 'POST',
            body: formDataImg,
          });

          if (uploadResponse.ok) {
            const { url } = await uploadResponse.json();
            uploadedAdditionalImages[i] = url;
          } else {
            console.error(`追加画像${i + 1}のアップロードに失敗しました`);
          }
        }
      }

      if (uploadedAdditionalImages.length > 0) {
        updatedFormData.additional_images = uploadedAdditionalImages;
      }

      // 店舗情報を更新
      const response = await fetch('/api/owner/update-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          storeId: store?.id,
          ...updatedFormData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update store');
      }

      alert('店舗情報を更新しました');

      // アップロードした画像をリセット
      setMainImageFile(null);
      setAdditionalImageFiles([null, null, null]);
    } catch (error) {
      console.error('Error updating store:', error);
      alert('更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 mb-2">無効なアクセス</h2>
            <p className="text-gray-600">
              このURLは無効か、有効期限が切れています。<br />
              正しいURLをご確認ください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', label: '基本情報' },
    { id: 'location', label: '立地・アクセス' },
    { id: 'business', label: '営業情報' },
    { id: 'images', label: '画像' },
    { id: 'contact', label: '連絡先' },
    { id: 'recruitment', label: '求人情報' },
    { id: 'welfare', label: '福利厚生' },
    { id: 'sns', label: 'SNS・Web' },
    { id: 'message', label: 'お知らせ配信' }
  ];

  const dayNames = {
    monday: '月曜日',
    tuesday: '火曜日',
    wednesday: '水曜日',
    thursday: '木曜日',
    friday: '金曜日',
    saturday: '土曜日',
    sunday: '日曜日'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">店舗情報編集</h1>
            <p className="mt-2 text-sm text-gray-600">
              {formData.name} の店舗情報を編集できます
            </p>
          </div>

          {/* タブメニュー */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-2 p-3">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-white bg-indigo-600 shadow-md'
                      : 'text-gray-600 bg-white hover:text-indigo-600 hover:bg-indigo-50 shadow-sm'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* 基本情報タブ */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      店舗名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ジャンル
                    </label>
                    <select
                      name="genre_id"
                      value={formData.genre_id || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">選択してください</option>
                      {masterData.genres.map(genre => (
                        <option key={genre.id} value={genre.id}>
                          {genre.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      店舗説明
                    </label>
                    <textarea
                      name="description"
                      value={formData.description || ''}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      価格レベル
                    </label>
                    <input
                      type="text"
                      name="price_level"
                      value={formData.price_level || ''}
                      onChange={handleInputChange}
                      placeholder="例: ¥¥¥"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      エリア
                    </label>
                    <input
                      type="text"
                      name="area"
                      value={formData.area || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      カスタムメモ（お知らせなど）
                    </label>
                    <textarea
                      name="custom_notes"
                      value={formData.custom_notes || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="お客様へのお知らせやメモを記入できます"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active ?? true}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">店舗を公開する</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 立地・アクセスタブ */}
            {activeTab === 'location' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      住所
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最寄り駅
                    </label>
                    <input
                      type="text"
                      name="station"
                      value={formData.station || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="駅名を入力"
                    />
                    {showStationSuggestions && stationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto">
                        {stationSuggestions.map(station => (
                          <div key={station.id} className="border-b border-gray-100 last:border-b-0">
                            <div className="px-3 py-2 font-medium text-gray-800 bg-gray-50">
                              {station.name}駅
                            </div>
                            {station.railway_lines.length > 1 ? (
                              <div className="px-3 pb-2">
                                <div className="text-xs text-gray-500 mb-1 pt-1">路線を選択してください：</div>
                                {station.railway_lines.map((line) => (
                                  <button
                                    key={`${station.id}-${line}`}
                                    type="button"
                                    onClick={() => handleStationSelect(station, line)}
                                    className="w-full text-left px-2 py-1 ml-2 text-sm hover:bg-indigo-50 cursor-pointer rounded border-l-2 border-indigo-200 mb-1"
                                  >
                                    {line}線 {station.name}駅
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStationSelect(station)}
                                className="w-full text-left px-3 py-1 text-sm hover:bg-gray-100 cursor-pointer"
                              >
                                {station.railway_lines[0] || ''}線 {station.name}駅
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      路線
                    </label>
                    <input
                      type="text"
                      name="station_line"
                      value={formData.station_line || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="路線名を入力"
                    />
                    {showRailwaySuggestions && railwaySuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        {railwaySuggestions.map(line => (
                          <button
                            key={line}
                            type="button"
                            onClick={() => handleRailwaySelect(line)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                          >
                            {line}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      駅からの距離
                    </label>
                    <input
                      type="text"
                      name="station_distance"
                      value={formData.station_distance || ''}
                      onChange={handleInputChange}
                      placeholder="例: 徒歩5分"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      緯度（読み取り専用）
                    </label>
                    <input
                      type="number"
                      name="latitude"
                      value={formData.latitude || ''}
                      readOnly
                      step="0.0000001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      経度（読み取り専用）
                    </label>
                    <input
                      type="number"
                      name="longitude"
                      value={formData.longitude || ''}
                      readOnly
                      step="0.0000001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Maps URL
                    </label>
                    <input
                      type="url"
                      name="google_maps_uri"
                      value={formData.google_maps_uri || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {(formData.station || formData.name) && (
                      <div className="mt-2">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${formData.station || ''} ${formData.name || ''}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 text-sm"
                        >
                          Google Mapsで開く →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 営業情報タブ */}
            {activeTab === 'business' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      電話番号 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number || ''}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      営業時間
                    </label>
                    <div className="space-y-3">
                      {Object.entries(dayNames).map(([dayKey, dayLabel]) => {
                        const closedFieldName = `hours_${dayKey}_closed` as keyof Store;
                        const openFieldName = `hours_${dayKey}_open` as keyof Store;
                        const closeFieldName = `hours_${dayKey}_close` as keyof Store;
                        const isClosed = formData[closedFieldName] as boolean || false;

                        return (
                          <div key={dayKey} className="flex items-center space-x-3">
                            <div className="w-24 font-medium text-sm">{dayLabel}</div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                name={closedFieldName}
                                checked={isClosed}
                                onChange={handleInputChange}
                                className="mr-2"
                              />
                              <span className="text-sm">定休日</span>
                            </label>
                            {!isClosed && (
                              <>
                                <input
                                  type="time"
                                  name={openFieldName}
                                  value={formData[openFieldName] as string || '11:00'}
                                  onChange={handleInputChange}
                                  className="px-2 py-1 border border-gray-300 rounded"
                                />
                                <span>〜</span>
                                <input
                                  type="time"
                                  name={closeFieldName}
                                  value={formData[closeFieldName] as string || '23:00'}
                                  onChange={handleInputChange}
                                  className="px-2 py-1 border border-gray-300 rounded"
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 画像タブ */}
            {activeTab === 'images' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メイン画像
                  </label>
                  <div className="flex items-start space-x-4">
                    {mainImagePreview && (
                      <div className="relative w-32 h-32">
                        <img
                          src={mainImagePreview}
                          alt="メイン画像"
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMainImageChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        JPG、PNG、GIF形式の画像をアップロードできます
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    追加画像（最大3枚）
                  </label>
                  <div className="space-y-3">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="flex items-start space-x-4">
                        {additionalImagePreviews[index] && (
                          <div className="relative w-32 h-32">
                            <img
                              src={additionalImagePreviews[index]!}
                              alt={`追加画像${index + 1}`}
                              className="w-full h-full object-cover rounded-md"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleAdditionalImageChange(index, e)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 連絡先タブ */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LINE ID
                    </label>
                    <input
                      type="text"
                      name="line_id"
                      value={formData.line_id || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 求人情報タブ */}
            {activeTab === 'recruitment' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      求人ステータス
                    </label>
                    <select
                      name="recruitment_status"
                      value={formData.recruitment_status || 'active'}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="active">募集中</option>
                      <option value="paused">一時停止</option>
                      <option value="closed">募集終了</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      勤務体系
                    </label>
                    <input
                      type="text"
                      name="work_system"
                      value={formData.work_system || ''}
                      onChange={handleInputChange}
                      placeholder="例: シフト制"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      時給（最低）
                    </label>
                    <input
                      type="number"
                      name="minimum_hourly_wage"
                      value={formData.minimum_hourly_wage || ''}
                      onChange={handleInputChange}
                      placeholder="例: 2000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      時給（最高）
                    </label>
                    <input
                      type="number"
                      name="maximum_hourly_wage"
                      value={formData.maximum_hourly_wage || ''}
                      onChange={handleInputChange}
                      placeholder="例: 5000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      平均日給
                    </label>
                    <input
                      type="number"
                      name="average_daily_income"
                      value={formData.average_daily_income || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      平均月給
                    </label>
                    <input
                      type="number"
                      name="average_monthly_income"
                      value={formData.average_monthly_income || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      バック率
                    </label>
                    <input
                      type="text"
                      name="back_rate"
                      value={formData.back_rate || ''}
                      onChange={handleInputChange}
                      placeholder="例: 50%"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ペナルティ制度
                    </label>
                    <input
                      type="text"
                      name="penalty_system"
                      value={formData.penalty_system || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      対象年齢（最小）
                    </label>
                    <input
                      type="number"
                      name="target_age_min"
                      value={formData.target_age_min || ''}
                      onChange={handleInputChange}
                      placeholder="例: 18"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      対象年齢（最大）
                    </label>
                    <input
                      type="number"
                      name="target_age_max"
                      value={formData.target_age_max || ''}
                      onChange={handleInputChange}
                      placeholder="例: 30"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ドレスコード
                    </label>
                    <input
                      type="text"
                      name="dress_code"
                      value={formData.dress_code || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      勤務条件
                    </label>
                    <textarea
                      name="working_conditions"
                      value={formData.working_conditions || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      求人メッセージ
                    </label>
                    <textarea
                      name="recruitment_message"
                      value={formData.recruitment_message || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      試用期間
                    </label>
                    <input
                      type="text"
                      name="trial_period"
                      value={formData.trial_period || ''}
                      onChange={handleInputChange}
                      placeholder="例: 3ヶ月"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      試用条件
                    </label>
                    <input
                      type="text"
                      name="trial_conditions"
                      value={formData.trial_conditions || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      面接場所
                    </label>
                    <input
                      type="text"
                      name="interview_location"
                      value={formData.interview_location || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      面接フロー
                    </label>
                    <input
                      type="text"
                      name="interview_flow"
                      value={formData.interview_flow || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 福利厚生タブ */}
            {activeTab === 'welfare' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      待遇・福利厚生
                    </label>
                    <textarea
                      name="treatment_benefits"
                      value={formData.treatment_benefits || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="dormitory_available"
                        checked={formData.dormitory_available || false}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">寮完備</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="daycare_available"
                        checked={formData.daycare_available || false}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">託児所あり</span>
                    </label>
                  </div>

                  {formData.dormitory_available && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        寮の詳細
                      </label>
                      <textarea
                        name="dormitory_details"
                        value={formData.dormitory_details || ''}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {formData.daycare_available && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        託児所の詳細
                      </label>
                      <textarea
                        name="daycare_details"
                        value={formData.daycare_details || ''}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SNS・Webタブ */}
            {activeTab === 'sns' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ウェブサイト
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram
                    </label>
                    <input
                      type="text"
                      name="sns_instagram"
                      value={formData.sns_instagram || ''}
                      onChange={handleInputChange}
                      placeholder="@username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Twitter
                    </label>
                    <input
                      type="text"
                      name="sns_twitter"
                      value={formData.sns_twitter || ''}
                      onChange={handleInputChange}
                      placeholder="@username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TikTok
                    </label>
                    <input
                      type="text"
                      name="sns_tiktok"
                      value={formData.sns_tiktok || ''}
                      onChange={handleInputChange}
                      placeholder="@username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* お知らせ配信タブ */}
            {activeTab === 'message' && (
              <div className="space-y-6">
                {/* お気に入り登録ユーザー数 */}
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        お気に入り登録ユーザー数
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {favoriteUsers.length}人
                      </p>
                    </div>
                  </div>
                </div>

                {/* メッセージ作成フォーム */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    新規メッセージ作成
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        メッセージタイプ
                      </label>
                      <select
                        value={messageType}
                        onChange={(e) => setMessageType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="notification">お知らせ</option>
                        <option value="campaign">キャンペーン</option>
                        <option value="news">ニュース</option>
                        <option value="other">その他</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        タイトル
                      </label>
                      <input
                        type="text"
                        value={messageTitle}
                        onChange={(e) => setMessageTitle(e.target.value)}
                        placeholder="例: 年末年始の営業時間のお知らせ"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        本文
                      </label>
                      <textarea
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        rows={5}
                        placeholder="メッセージの内容を入力してください"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={isSendingMessage || favoriteUsers.length === 0}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingMessage ? '送信中...' : `${favoriteUsers.length}人に送信`}
                    </button>
                  </div>
                </div>

                {/* 送信履歴 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    送信履歴
                  </h3>

                  {messageHistory.length > 0 ? (
                    <div className="space-y-4">
                      {messageHistory.map((msg: any) => {
                        // 24時間以内かどうかを判定
                        const sentAt = new Date(msg.sent_at);
                        const now = new Date();
                        const hoursSinceSent = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);
                        const canCancel = !msg.is_cancelled && hoursSinceSent < 24;

                        return (
                          <div
                            key={msg.broadcast_id}
                            className={`border-l-4 ${msg.is_cancelled ? 'border-red-400 bg-red-50' : 'border-indigo-400'} pl-4 py-3 rounded-r-lg`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 pr-4">
                                <div className="flex items-start gap-2">
                                  <h4 className="font-medium text-gray-900">
                                    {msg.title}
                                  </h4>
                                  {msg.is_cancelled && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                      取り消し済み
                                    </span>
                                  )}
                                </div>

                                {/* メッセージ内容を展開可能にする */}
                                <details className="mt-2">
                                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                                    メッセージ内容を表示
                                  </summary>
                                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                                      {msg.content}
                                    </pre>
                                  </div>
                                </details>

                                {/* 取り消し理由の表示 */}
                                {msg.is_cancelled && msg.cancellation_reason && (
                                  <div className="mt-2 text-sm text-red-600">
                                    取り消し理由: {msg.cancellation_reason}
                                  </div>
                                )}
                                {msg.is_cancelled && msg.cancelled_at && (
                                  <div className="text-sm text-red-500">
                                    取り消し日時: {new Date(msg.cancelled_at).toLocaleString('ja-JP')}
                                  </div>
                                )}
                              </div>

                              <div className="text-right ml-4 min-w-[140px]">
                                <p className="text-sm text-gray-500">
                                  {sentAt.toLocaleDateString('ja-JP')}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {sentAt.toLocaleTimeString('ja-JP')}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {msg.total_recipients}人に送信
                                </p>
                                <p className="text-sm text-gray-500">
                                  開封率: {msg.read_rate}%
                                </p>

                                {/* 取り消しボタン */}
                                {canCancel && (
                                  <button
                                    onClick={() => handleCancelMessage(msg.broadcast_id, msg.title)}
                                    className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                  >
                                    取り消し
                                  </button>
                                )}
                                {!msg.is_cancelled && !canCancel && hoursSinceSent >= 24 && (
                                  <p className="mt-2 text-xs text-gray-400">
                                    取り消し期限切れ
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500">まだメッセージを送信していません</p>
                  )}
                </div>
              </div>
            )}

            {/* 送信ボタン */}
            <div className="flex justify-end mt-8 pt-6 border-t">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存する'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}