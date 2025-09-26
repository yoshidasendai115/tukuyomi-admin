'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface StoreData {
  id: string;
  name: string;
  address: string;
  phone: string;
  business_hours: string;
  regular_holiday: string;
  description: string;
  hourly_wage: string;
  job_description: string;
  benefits: string;
  work_conditions: string;
  instagram_url: string;
  twitter_url: string;
  tiktok_url: string;
  recruitment_message: string;
}

export default function StoreEditPage({ params }: { params: { uuid: string } }) {
  const router = useRouter();
  const [storeData, setStoreData] = useState<StoreData>({
    id: '',
    name: '',
    address: '',
    phone: '',
    business_hours: '',
    regular_holiday: '',
    description: '',
    hourly_wage: '',
    job_description: '',
    benefits: '',
    work_conditions: '',
    instagram_url: '',
    twitter_url: '',
    tiktok_url: '',
    recruitment_message: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    checkSession();
    fetchStoreData();

    // 自動保存（5分ごと）
    const autoSaveInterval = setInterval(() => {
      handleSave(true);
    }, 5 * 60 * 1000);

    // セッションタイムアウト（2時間）
    const sessionTimeout = setTimeout(() => {
      sessionStorage.clear();
      router.push(`/store/${params.uuid}/login`);
    }, 2 * 60 * 60 * 1000);

    return () => {
      clearInterval(autoSaveInterval);
      clearTimeout(sessionTimeout);
    };
  }, []);

  const checkSession = () => {
    // セッションチェック
    const authenticated = sessionStorage.getItem('store_authenticated');
    const storeUuid = sessionStorage.getItem('store_uuid');
    const authTimestamp = sessionStorage.getItem('auth_timestamp');

    if (!authenticated || storeUuid !== params.uuid) {
      router.push(`/store/${params.uuid}/login`);
      return;
    }

    // セッションタイムアウトチェック（2時間）
    if (authTimestamp) {
      const authTime = new Date(authTimestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - authTime.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 2) {
        sessionStorage.clear();
        router.push(`/store/${params.uuid}/login`);
        return;
      }
    }
  };

  const fetchStoreData = async () => {
    try {
      const storeId = sessionStorage.getItem('store_id');
      if (!storeId) {
        throw new Error('Store ID not found');
      }

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;

      setStoreData({
        id: data.id,
        name: data.name || '',
        address: data.address || '',
        phone: data.phone || '',
        business_hours: data.business_hours || '',
        regular_holiday: data.regular_holiday || '',
        description: data.description || '',
        hourly_wage: data.hourly_wage || '',
        job_description: data.job_description || '',
        benefits: data.benefits || '',
        work_conditions: data.work_conditions || '',
        instagram_url: data.instagram_url || '',
        twitter_url: data.twitter_url || '',
        tiktok_url: data.tiktok_url || '',
        recruitment_message: data.recruitment_message || ''
      });
    } catch (error) {
      console.error('Error fetching store data:', error);
      setMessage('店舗データの取得に失敗しました');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStoreData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (isAutoSave = false) => {
    setIsSaving(true);
    if (!isAutoSave) {
      setMessage('');
    }

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name: storeData.name,
          address: storeData.address,
          phone: storeData.phone,
          business_hours: storeData.business_hours,
          regular_holiday: storeData.regular_holiday,
          description: storeData.description,
          hourly_wage: storeData.hourly_wage,
          job_description: storeData.job_description,
          benefits: storeData.benefits,
          work_conditions: storeData.work_conditions,
          instagram_url: storeData.instagram_url,
          twitter_url: storeData.twitter_url,
          tiktok_url: storeData.tiktok_url,
          recruitment_message: storeData.recruitment_message,
          updated_at: new Date().toISOString()
        })
        .eq('id', storeData.id);

      if (error) throw error;

      setLastSaved(new Date());
      if (!isAutoSave) {
        setMessage('保存しました');
        setMessageType('success');
      }

      // アクセスログ記録
      await supabase
        .from('admin_access_logs')
        .insert({
          store_id: storeData.id,
          action: 'store_edit',
          details: { auto_save: isAutoSave, uuid: params.uuid },
          ip_address: 'client_ip'
        });

    } catch (error) {
      console.error('Error saving store data:', error);
      if (!isAutoSave) {
        setMessage('保存に失敗しました');
        setMessageType('error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push(`/store/${params.uuid}/login`);
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
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">店舗情報編集</h1>
              <p className="text-sm text-gray-600">{storeData.name}</p>
              {lastSaved && (
                <p className="text-xs text-gray-500">
                  最終保存: {lastSaved.toLocaleTimeString('ja-JP')}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メッセージ */}
      {message && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4`}>
          <div className={`p-4 rounded-md ${
            messageType === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        </div>
      )}

      {/* 編集フォーム */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-8">
            {/* 基本情報 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    店舗名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={storeData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    電話番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={storeData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    住所 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={storeData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    営業時間
                  </label>
                  <input
                    type="text"
                    name="business_hours"
                    value={storeData.business_hours}
                    onChange={handleInputChange}
                    placeholder="例：10:00-22:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    定休日
                  </label>
                  <input
                    type="text"
                    name="regular_holiday"
                    value={storeData.regular_holiday}
                    onChange={handleInputChange}
                    placeholder="例：水曜日"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </section>

            {/* 店舗説明 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">店舗説明</h2>
              <div>
                <textarea
                  name="description"
                  value={storeData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="店舗の特徴や雰囲気などを記載してください"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </section>

            {/* 求人情報 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">求人情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    時給
                  </label>
                  <input
                    type="text"
                    name="hourly_wage"
                    value={storeData.hourly_wage}
                    onChange={handleInputChange}
                    placeholder="例：1,200円〜"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    募集要項
                  </label>
                  <textarea
                    name="job_description"
                    value={storeData.job_description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="募集職種、仕事内容などを記載してください"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    待遇
                  </label>
                  <textarea
                    name="benefits"
                    value={storeData.benefits}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="交通費支給、まかない有りなど"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    勤務条件
                  </label>
                  <textarea
                    name="work_conditions"
                    value={storeData.work_conditions}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="週2日〜OK、シフト制など"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    募集メッセージ
                  </label>
                  <textarea
                    name="recruitment_message"
                    value={storeData.recruitment_message}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="求職者へのメッセージ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </section>

            {/* SNS情報 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">SNS情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    name="instagram_url"
                    value={storeData.instagram_url}
                    onChange={handleInputChange}
                    placeholder="https://instagram.com/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Twitter URL
                  </label>
                  <input
                    type="url"
                    name="twitter_url"
                    value={storeData.twitter_url}
                    onChange={handleInputChange}
                    placeholder="https://twitter.com/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TikTok URL
                  </label>
                  <input
                    type="url"
                    name="tiktok_url"
                    value={storeData.tiktok_url}
                    onChange={handleInputChange}
                    placeholder="https://www.tiktok.com/@..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* 保存ボタン（下部） */}
          <div className="mt-8 pt-6 border-t flex justify-end space-x-3">
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}