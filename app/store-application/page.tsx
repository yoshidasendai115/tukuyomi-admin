'use client';

import { useState, useEffect } from 'react';

interface Genre {
  id: string;
  name: string;
  is_visible: boolean;
  display_order: number;
}

interface FormData {
  store_name: string;
  store_address: string;
  store_phone: string;
  genre_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  applicant_role: string;
  license_holder_name: string;
  applicant_relationship: 'owner' | 'manager' | 'employee' | 'representative';
  business_license: string;
  additional_info: string;
  business_license_image: string;
  additional_document_type: 'late_night_license' | 'corporate_registry' | 'identity_document' | '';
  additional_document_image: string;
  identity_document_image: string;
}

export default function StoreApplicationPage() {
  const [formData, setFormData] = useState<FormData>({
    store_name: '',
    store_address: '',
    store_phone: '',
    genre_id: '',
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    applicant_role: '',
    license_holder_name: '',
    applicant_relationship: 'owner',
    business_license: '',
    additional_info: '',
    business_license_image: '',
    additional_document_type: '',
    additional_document_image: '',
    identity_document_image: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{[key: string]: boolean}>({});
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      const response = await fetch('/api/masters/data');
      const { genres: genresData, error } = await response.json();

      if (!response.ok) {
        throw new Error(error || 'Failed to fetch genres');
      }

      setGenres(genresData || []);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = async (file: File, fieldName: string) => {
    if (!file) return;

    setUploadingFiles(prev => ({ ...prev, [fieldName]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'store-applications');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Upload error:', response.status, errorData);
        throw new Error(errorData.error || `アップロードに失敗しました (${response.status})`);
      }

      const result = await response.json();

      console.log('Upload result:', result);
      console.log('Image URL:', result.url);

      setFormData(prev => ({
        ...prev,
        [fieldName]: result.url
      }));

      alert('ファイルのアップロードが完了しました');
    } catch (error) {
      console.error('Upload error:', error);
      alert('ファイルのアップロードに失敗しました');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.business_license_image) {
      alert('飲食店営業許可証の画像をアップロードしてください');
      return;
    }

    // 追加書類のバリデーション
    if (!formData.additional_document_type) {
      alert('追加書類を選択してください');
      return;
    }

    // 選択した追加書類のアップロードをチェック
    const documentImageMap: { [key: string]: string } = {
      'late_night_license': formData.additional_document_image || '',
      'corporate_registry': formData.additional_document_image || '',
      'identity_document': formData.identity_document_image || ''
    };

    if (!documentImageMap[formData.additional_document_type]) {
      alert('選択した追加書類をアップロードしてください');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          document_type: 'restaurant_license'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '申請の送信に失敗しました');
      }

      const result = await response.json();
      alert(result.message);

      // フォームをリセット
      setFormData({
        store_name: '',
        store_address: '',
        store_phone: '',
        business_type: 'restaurant',
        applicant_name: '',
        applicant_email: '',
        applicant_phone: '',
        applicant_role: '',
        license_holder_name: '',
        applicant_relationship: 'owner',
        business_license: '',
        additional_info: '',
        business_license_image: '',
        additional_document_type: '',
        additional_document_image: '',
        identity_document_image: ''
      });

    } catch (error) {
      console.error('Submit error:', error);
      alert(error instanceof Error ? error.message : '申請の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">店舗編集権限申請フォーム</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 店舗情報 */}
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">店舗情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    店舗名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="store_name"
                    value={formData.store_name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    電話番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="store_phone"
                    value={formData.store_phone}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    住所 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="store_address"
                    value={formData.store_address}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    業態 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="genre_id"
                    value={formData.genre_id}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">業態を選択してください</option>
                    {genres.map(genre => (
                      <option key={genre.id} value={genre.id}>
                        {genre.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 申請者情報 */}
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">申請者情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    申請者名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="applicant_name"
                    value={formData.applicant_name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    役職・立場 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="applicant_role"
                    value={formData.applicant_role}
                    onChange={handleInputChange}
                    required
                    placeholder="例：店長、オーナー、マネージャー"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="applicant_email"
                    value={formData.applicant_email}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    電話番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="applicant_phone"
                    value={formData.applicant_phone}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    許可証名義人
                  </label>
                  <input
                    type="text"
                    name="license_holder_name"
                    value={formData.license_holder_name}
                    onChange={handleInputChange}
                    placeholder="申請者と異なる場合のみ入力"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    店舗との関係 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="applicant_relationship"
                    value={formData.applicant_relationship}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="owner">所有者</option>
                    <option value="manager">管理者</option>
                    <option value="employee">従業員</option>
                    <option value="representative">代理人</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 書類アップロード */}
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">必要書類のアップロード</h2>

              {/* 飲食店営業許可証 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  飲食店営業許可証 <span className="text-red-500">*</span>
                </label>
                <div className="mb-2">
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    ファイルを選択（写真またはPDF）
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'business_license_image');
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  name="business_license"
                  value={formData.business_license}
                  onChange={handleInputChange}
                  placeholder="許可証番号（任意）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                {uploadingFiles.business_license_image && (
                  <p className="text-sm text-blue-600 mt-1">アップロード中...</p>
                )}
                {formData.business_license_image && (
                  <div className="mt-2">
                    {formData.business_license_image.toLowerCase().endsWith('.pdf') ? (
                      <div className="flex items-center space-x-2 p-3 border rounded bg-gray-50">
                        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">PDFファイル</p>
                          <a href={formData.business_license_image} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            ファイルを開く
                          </a>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={formData.business_license_image}
                        alt="飲食店営業許可証"
                        className="w-32 h-32 object-cover border rounded"
                        onLoad={() => console.log('Image loaded successfully:', formData.business_license_image)}
                        onError={(e) => {
                          console.error('Image load error:', formData.business_license_image);
                          console.error('Error event:', e);
                        }}
                      />
                    )}
                    <p className="text-sm text-green-600 mt-1">✓ アップロード完了</p>
                  </div>
                )}
              </div>

              {/* 追加書類 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  追加書類（以下のいずれか） <span className="text-red-500">*</span>
                </label>
                <select
                  name="additional_document_type"
                  value={formData.additional_document_type}
                  onChange={handleInputChange}
                  required
                  className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">選択してください</option>
                  <option value="late_night_license">深夜酒類提供飲食店営業届出</option>
                  <option value="corporate_registry">法人登記簿謄本</option>
                  <option value="identity_document">身分証明書</option>
                </select>
                {formData.additional_document_type && (
                  <>
                    <div className="mb-2">
                      <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        ファイルを選択（写真またはPDF）
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'additional_document_image');
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {uploadingFiles.additional_document_image && (
                      <p className="text-sm text-blue-600 mt-1">アップロード中...</p>
                    )}
                    {formData.additional_document_image && (
                      <div className="mt-2">
                        {formData.additional_document_image.toLowerCase().endsWith('.pdf') ? (
                          <div className="flex items-center space-x-2 p-3 border rounded bg-gray-50">
                            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">PDFファイル</p>
                              <a href={formData.additional_document_image} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                ファイルを開く
                              </a>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={formData.additional_document_image}
                            alt="追加書類"
                            className="w-32 h-32 object-cover border rounded"
                            onLoad={() => console.log('Additional document image loaded:', formData.additional_document_image)}
                            onError={(e) => {
                              console.error('Additional document image load error:', formData.additional_document_image);
                              console.error('Error event:', e);
                            }}
                          />
                        )}
                        <p className="text-sm text-green-600 mt-1">✓ アップロード完了</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 身分証明書 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  申請者の身分証明書（推奨）
                </label>
                <div className="mb-2">
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-600 border border-transparent rounded-md font-semibold text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    ファイルを選択（写真またはPDF）
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'identity_document_image');
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploadingFiles.identity_document_image && (
                  <p className="text-sm text-blue-600 mt-1">アップロード中...</p>
                )}
                {formData.identity_document_image && (
                  <div className="mt-2">
                    {formData.identity_document_image.toLowerCase().endsWith('.pdf') ? (
                      <div className="flex items-center space-x-2 p-3 border rounded bg-gray-50">
                        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">PDFファイル</p>
                          <a href={formData.identity_document_image} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            ファイルを開く
                          </a>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={formData.identity_document_image}
                        alt="身分証明書"
                        className="w-32 h-32 object-cover border rounded"
                        onLoad={() => console.log('Identity document image loaded:', formData.identity_document_image)}
                        onError={(e) => {
                          console.error('Identity document image load error:', formData.identity_document_image);
                          console.error('Error event:', e);
                        }}
                      />
                    )}
                    <p className="text-sm text-green-600 mt-1">✓ アップロード完了</p>
                  </div>
                )}
              </div>
            </div>

            {/* 補足事項 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                補足事項・特記事項
              </label>
              <textarea
                name="additional_info"
                value={formData.additional_info}
                onChange={handleInputChange}
                rows={4}
                placeholder="申請に関する補足事項があれば記入してください"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {/* 注意事項 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h3 className="font-medium text-yellow-800 mb-2">ご注意</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• 申請後、管理者による書類確認を行います</li>
                <li>• 確認完了後、店舗編集用のURLをメールでお送りします</li>
                <li>• 書類は5MB以下のJPG、PNG、WebP、PDF形式でアップロードしてください</li>
                <li>• 飲食店営業許可証と追加書類のアップロードは必須です</li>
                <li>• 個人情報は厳重に管理し、申請処理以外には使用いたしません</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !formData.business_license_image || !formData.additional_document_type ||
                  (formData.additional_document_type === 'identity_document' ? !formData.identity_document_image : !formData.additional_document_image)}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '送信中...' : '申請を送信'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}