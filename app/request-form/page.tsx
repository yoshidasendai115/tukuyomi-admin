'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatJapanesePhoneNumber, validateJapanesePhoneNumber } from '@/lib/utils/phoneFormatter';

interface FormData {
  store_name: string;
  store_address: string;
  store_phone: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  applicant_role: string;
  additional_info: string;
}

export default function RequestFormPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    store_name: '',
    store_address: '',
    store_phone: '',
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    applicant_role: '店舗オーナー',
    additional_info: '',
  });


  // メールアドレスバリデーション
  const isValidEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 入力ハンドラー
  const handleInputChange = (field: keyof FormData, value: string) => {
    // 電話番号フィールドの場合は自動整形
    let processedValue = value;
    if (field === 'store_phone' || field === 'applicant_phone') {
      processedValue = formatJapanesePhoneNumber(value);
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  // 送信ハンドラー
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション: 店舗名の文字数チェック（最大30文字）
    if (formData.store_name && formData.store_name.length > 30) {
      alert(`店舗名は30文字以内で入力してください。\n現在: ${formData.store_name.length}文字（${formData.store_name.length - 30}文字オーバー）`);
      return;
    }

    // バリデーション: 店舗電話番号のチェック
    if (!validateJapanesePhoneNumber(formData.store_phone)) {
      alert('店舗電話番号の形式が正しくありません。\n\n正しい形式:\n・ハイフンを2つ含む\n・末尾は4桁\n・例: 03-1234-5678、090-1234-5678、0119-99-9999');
      return;
    }

    // バリデーション: 申請者メールアドレスのチェック
    if (!isValidEmail(formData.applicant_email)) {
      alert('メールアドレスの形式が正しくありません。\n正しいメールアドレスを入力してください。');
      return;
    }

    // バリデーション: 申請者電話番号のチェック
    if (!validateJapanesePhoneNumber(formData.applicant_phone)) {
      alert('申請者電話番号の形式が正しくありません。\n\n正しい形式:\n・ハイフンを2つ含む\n・末尾は4桁\n・例: 03-1234-5678、090-1234-5678、0119-99-9999');
      return;
    }

    // バリデーション: 補足事項の文字数チェック（最大100文字）
    if (formData.additional_info && formData.additional_info.length > 100) {
      alert(`補足事項・特記事項は100文字以内で入力してください。\n現在: ${formData.additional_info.length}文字（${formData.additional_info.length - 100}文字オーバー）`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '申請の送信に失敗しました');
      }

      alert('申請が正常に送信されました。\n管理者による確認をお待ちください。');

      // フォームをリセット
      setFormData({
        store_name: '',
        store_address: '',
        store_phone: '',
        applicant_name: '',
        applicant_email: '',
        applicant_phone: '',
        applicant_role: '店舗オーナー',
        additional_info: '',
      });
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('申請の送信中にエラーが発生しました。\nもう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">店舗編集権限 申請フォーム</h1>
          <p className="text-sm text-gray-600">
            店舗情報の編集権限を申請するためのフォームです。<br />
            すべての必須項目をご入力の上、送信してください。
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          {/* 店舗情報セクション */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">店舗情報</h2>

            {/* 店舗名 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                店舗名 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.store_name}
                onChange={(e) => handleInputChange('store_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="例: カフェ&バー つくよみ"
              />
              <p className={`mt-1 text-xs ${
                formData.store_name.length > 30
                  ? 'text-red-600 font-semibold'
                  : 'text-gray-500'
              }`}>
                {formData.store_name.length > 30
                  ? `${formData.store_name.length}/30文字（${formData.store_name.length - 30}文字オーバー）`
                  : `${formData.store_name.length}/30文字`}
              </p>
            </div>

            {/* 店舗住所 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                店舗住所 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.store_address}
                onChange={(e) => handleInputChange('store_address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="例: 東京都渋谷区道玄坂1-2-3 ビル名 4F"
              />
            </div>

            {/* 店舗電話番号 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                店舗電話番号（ハイフン必須） <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.store_phone}
                onChange={(e) => handleInputChange('store_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="例: 03-1234-5678 または 090-1234-5678"
              />
              <p className="mt-1 text-xs text-gray-500">
                日本国内の電話番号（例: 03-1234-5678、090-1234-5678、0119-99-9999）
              </p>
            </div>
          </div>

          {/* 申請者情報セクション */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">申請者情報</h2>

            {/* 申請者名 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                申請者名 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.applicant_name}
                onChange={(e) => handleInputChange('applicant_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="例: 山田 太郎"
              />
            </div>

            {/* 申請者メールアドレス */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.applicant_email}
                onChange={(e) => handleInputChange('applicant_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="例: yamada@example.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                ログインIDとして使用されます
              </p>
            </div>

            {/* 申請者電話番号 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                申請者電話番号（ハイフン必須） <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.applicant_phone}
                onChange={(e) => handleInputChange('applicant_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="例: 090-1234-5678"
              />
              <p className="mt-1 text-xs text-gray-500">
                日本国内の電話番号（例: 03-1234-5678、090-1234-5678、0119-99-9999）
              </p>
            </div>

            {/* 申請者役職 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                申請者役職
              </label>
              <select
                value={formData.applicant_role}
                onChange={(e) => handleInputChange('applicant_role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="店舗オーナー">店舗オーナー</option>
                <option value="店長">店長</option>
                <option value="副店長">副店長</option>
                <option value="マネージャー">マネージャー</option>
                <option value="その他">その他</option>
              </select>
            </div>
          </div>

          {/* 補足事項セクション */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">補足事項・特記事項</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                補足事項（任意）
              </label>
              <textarea
                value={formData.additional_info}
                onChange={(e) => handleInputChange('additional_info', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="申請に関する補足事項や特記事項があればご記入ください"
              />
              <p className={`mt-1 text-xs ${
                formData.additional_info.length > 100
                  ? 'text-red-600 font-semibold'
                  : 'text-gray-500'
              }`}>
                {formData.additional_info.length > 100
                  ? `${formData.additional_info.length}/100文字（${formData.additional_info.length - 100}文字オーバー）`
                  : `${formData.additional_info.length}/100文字`}
              </p>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">ご注意</h3>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>申請内容は管理者によって審査されます</li>
              <li>審査には数日かかる場合があります</li>
              <li>承認後、登録されたメールアドレスにログイン情報が送信されます</li>
              <li>入力された情報は申請の審査のみに使用されます</li>
            </ul>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                if (confirm('入力内容をクリアしますか?')) {
                  setFormData({
                    store_name: '',
                    store_address: '',
                    store_phone: '',
                    applicant_name: '',
                    applicant_email: '',
                    applicant_phone: '',
                    applicant_role: '店舗オーナー',
                    additional_info: '',
                  });
                }
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              クリア
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 text-white rounded-md ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isSubmitting ? '送信中...' : '申請を送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
