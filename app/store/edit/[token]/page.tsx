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

interface TokenInfo {
  id: string;
  store_id: string;
  token: string;
  is_active: boolean;
  expires_at: string | null;
}

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function TokenEditPage({ params }: PageProps) {
  const router = useRouter();
  const [token, setToken] = useState<string>('');
  const [paramsLoaded, setParamsLoaded] = useState(false);
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
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  useEffect(() => {
    // Paramsを展開
    params.then((p) => {
      setToken(p.token);
      setParamsLoaded(true);
    });
  }, [params]);

  useEffect(() => {
    if (paramsLoaded && token) {
      validateTokenAndFetch();
    }
  }, [token, paramsLoaded]);

  useEffect(() => {
    // 自動保存（5分ごと）
    const autoSaveInterval = setInterval(() => {
      if (tokenValid) {
        handleSave(true);
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [tokenValid]);

  const validateTokenAndFetch = async () => {
    try {
      // トークンの検証
      const { data: tokenData, error: tokenError } = await supabase
        .from('admin_store_edit_tokens')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenData) {
        setMessage('無効なトークンです');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      // 有効期限チェック
      if (tokenData.expires_at) {
        const expiryDate = new Date(tokenData.expires_at);
        if (expiryDate < new Date()) {
          setMessage('トークンの有効期限が切れています');
          setMessageType('error');
          setIsLoading(false);
          return;
        }
      }

      setTokenInfo(tokenData);
      setTokenValid(true);

      // 最終使用日時を更新（APIを経由）
      try {
        const updateResponse = await fetch('/api/tokens/update-last-used', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: params.token }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          console.error('Failed to update last_used_at:', errorData);
        }
      } catch (error) {
        console.error('Failed to update last_used_at:', error);
      }

      // 店舗データを取得
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', tokenData.store_id)
        .single();

      if (storeError || !storeData) {
        throw new Error('店舗データの取得に失敗しました');
      }

      setStoreData({
        id: storeData.id,
        name: storeData.name || '',
        address: storeData.address || '',
        phone: storeData.phone || '',
        business_hours: storeData.business_hours || '',
        regular_holiday: storeData.regular_holiday || '',
        description: storeData.description || '',
        hourly_wage: storeData.hourly_wage || '',
        job_description: storeData.job_description || '',
        benefits: storeData.benefits || '',
        work_conditions: storeData.work_conditions || '',
        instagram_url: storeData.instagram_url || '',
        twitter_url: storeData.twitter_url || '',
        tiktok_url: storeData.tiktok_url || '',
        recruitment_message: storeData.recruitment_message || ''
      });

      // アクセスログ記録
      await supabase
        .from('admin_access_logs')
        .insert({
          store_id: tokenData.store_id,
          action: 'token_edit_access',
          details: { token: params.token, token_id: tokenData.id },
          ip_address: 'client_ip'
        });

    } catch (error) {
      console.error('Error:', error);
      setMessage('エラーが発生しました');
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
    if (!tokenValid || !tokenInfo) return;

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

      // 最終使用日時を更新（保存時もAPIを経由）
      try {
        await fetch('/api/tokens/update-last-used', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: params.token }),
        });
      } catch (error) {
        console.error('Failed to update last_used_at in save:', error);
      }

      // アクセスログ記録
      await supabase
        .from('admin_access_logs')
        .insert({
          store_id: storeData.id,
          action: 'token_edit_save',
          details: { auto_save: isAutoSave, token_id: tokenInfo.id },
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">アクセスエラー</h1>
            <p className="text-gray-600">{message || '無効なトークンです'}</p>
            <p className="text-sm text-gray-500 mt-4">管理者にお問い合わせください</p>
          </div>
        </div>
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
              <p className="text-sm text-gray-600">{storeData.name} の店舗情報を編集できます</p>
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