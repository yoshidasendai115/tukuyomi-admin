'use client';

import { useState, useEffect } from 'react';

interface Genre {
  id: string;
  name: string;
  is_visible: boolean;
  display_order: number;
}

interface Station {
  id: string;
  name: string;
  railway_lines: string[];
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
  nearest_station: string;
  railway_line: string;
  station_distance: string;
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
    identity_document_image: '',
    nearest_station: '',
    railway_line: '',
    station_distance: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{[key: string]: boolean}>({});
  const [genres, setGenres] = useState<Genre[]>([]);
  const [phoneErrors, setPhoneErrors] = useState<{
    store_phone: string;
    applicant_phone: string;
  }>({
    store_phone: '',
    applicant_phone: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 立地・アクセス関連のstate
  const [stations, setStations] = useState<Station[]>([]);
  const [railwayLines, setRailwayLines] = useState<string[]>([]);
  const [stationSuggestions, setStationSuggestions] = useState<Station[]>([]);
  const [showStationSuggestions, setShowStationSuggestions] = useState(false);
  const [railwaySuggestions, setRailwaySuggestions] = useState<string[]>([]);
  const [showRailwaySuggestions, setShowRailwaySuggestions] = useState(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const response = await fetch('/api/masters/data');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch master data');
      }

      setGenres(data.genres || []);
      setStations(data.stations || []);
      setRailwayLines(data.railwayLines || []);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  // 電話番号バリデーション（ハイフン必須）
  const validatePhoneNumber = (phone: string): boolean => {
    // 日本の電話番号形式（ハイフン付き）
    // 固定電話: 03-1234-5678, 0120-123-456 など
    // 携帯電話: 090-1234-5678, 080-1234-5678 など
    const phoneRegex = /^0\d{1,4}-\d{1,4}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // 電話番号フィールドの場合はバリデーション
    if (name === 'store_phone' || name === 'applicant_phone') {
      if (
        typeof value === 'string' &&
        value.length > 0 &&
        !validatePhoneNumber(value)
      ) {
        setPhoneErrors(prev => ({
          ...prev,
          [name]: 'ハイフン付きで入力してください（例: 03-1234-5678, 090-1234-5678）'
        }));
      } else {
        setPhoneErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }

    // 駅名入力時のサジェスト表示
    if (name === 'nearest_station') {
      if (typeof value === 'string' && value.length > 0 && stations.length > 0) {
        const filtered = stations.filter(station =>
          station.name.toLowerCase().includes(value.toLowerCase())
        );
        setStationSuggestions(filtered.slice(0, 5));
        setShowStationSuggestions(true);
      } else {
        setShowStationSuggestions(false);
      }
    }

    // 路線入力時のサジェスト表示
    if (name === 'railway_line') {
      if (typeof value === 'string' && value.length > 0 && railwayLines.length > 0) {
        const filtered = railwayLines.filter(line =>
          line.toLowerCase().includes(value.toLowerCase())
        );
        setRailwaySuggestions(filtered.slice(0, 5));
        setShowRailwaySuggestions(true);
      } else {
        setShowRailwaySuggestions(false);
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 駅選択時のハンドラー
  const handleStationSelect = (station: Station, selectedLine: string | null = null) => {
    setFormData(prev => ({
      ...prev,
      nearest_station: station.name,
      railway_line: selectedLine || (station.railway_lines.length > 0 ? station.railway_lines[0] : '')
    }));
    setShowStationSuggestions(false);
  };

  // 路線選択時のハンドラー
  const handleRailwaySelect = (line: string) => {
    setFormData(prev => ({
      ...prev,
      railway_line: line
    }));
    setShowRailwaySuggestions(false);
  };

  // 距離自動計算
  const calculateDistance = async () => {
    const station = formData.nearest_station;
    const address = formData.store_address;

    if (!station || !address) {
      alert('駅名と住所の両方が入力されている必要があります');
      return;
    }

    setIsCalculatingDistance(true);
    try {
      const response = await fetch(
        `/api/maps/distance?station=${encodeURIComponent(station)}&address=${encodeURIComponent(address)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '距離の計算に失敗しました');
      }

      const data = await response.json();

      setFormData(prev => ({
        ...prev,
        station_distance: data.formattedDistance
      }));

      alert(`距離を自動計算しました: ${data.formattedDistance}`);
    } catch (error) {
      console.error('Error calculating distance:', error);
      alert(error instanceof Error ? error.message : '距離の計算中にエラーが発生しました');
    } finally {
      setIsCalculatingDistance(false);
    }
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

    // 電話番号のバリデーション
    if (!validatePhoneNumber(formData.store_phone)) {
      alert('店舗電話番号をハイフン付きで入力してください（例: 03-1234-5678）');
      return;
    }

    if (!validatePhoneNumber(formData.applicant_phone)) {
      alert('申請者電話番号をハイフン付きで入力してください（例: 090-1234-5678）');
      return;
    }

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

      // 送信成功：サンクスページを表示
      setIsSubmitted(true);

    } catch (error) {
      console.error('Submit error:', error);
      alert(error instanceof Error ? error.message : '申請の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 送信完了後はサンクスページを表示
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">ご登録ありがとうございます</h1>
            <p className="text-lg text-gray-700 mb-6">
              店舗編集権限申請を受け付けました。
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">今後の流れ</h3>
                  <div className="text-sm text-blue-700 space-y-2">
                    <p>1. ご登録いただいたメールアドレスに受付確認メールをお送りしました</p>
                    <p>2. 管理者が申請内容と書類を確認いたします（2〜3営業日）</p>
                    <p>3. 承認後、ログイン情報をメールでお送りします</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              ご不明な点がございましたら、お気軽にお問い合わせください。
            </p>
            <p className="text-xs text-gray-500">
              このページは閉じていただいて構いません。
            </p>
          </div>
        </div>
      </div>
    );
  }

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
                    placeholder="例: 03-1234-5678"
                    className={`mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                      phoneErrors.store_phone.length > 0 ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {phoneErrors.store_phone.length > 0 && (
                    <p className="text-sm text-red-600 mt-1">{phoneErrors.store_phone}</p>
                  )}
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

            {/* 立地・アクセス */}
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">立地・アクセス</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">
                    最寄り駅
                  </label>
                  <input
                    type="text"
                    name="nearest_station"
                    value={formData.nearest_station}
                    onChange={handleInputChange}
                    placeholder="駅名を入力"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  {showStationSuggestions && stationSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto">
                      {stationSuggestions.map(station => (
                        <div key={station.id} className="border-b border-gray-100 last:border-b-0">
                          {station.railway_lines.length > 1 ? (
                            <div className="px-3 py-2">
                              {station.railway_lines.map((line) => (
                                <button
                                  key={`${station.id}-${line}`}
                                  type="button"
                                  onClick={() => handleStationSelect(station, line)}
                                  className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer mb-1"
                                >
                                  {line} {station.name}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStationSelect(station, null)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                            >
                              {station.railway_lines[0] || ''} {station.name}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">
                    路線
                  </label>
                  <input
                    type="text"
                    name="railway_line"
                    value={formData.railway_line}
                    onChange={handleInputChange}
                    placeholder="路線名を入力"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    駅からの距離
                  </label>
                  <div className="flex space-x-2 mt-1">
                    <input
                      type="text"
                      name="station_distance"
                      value={formData.station_distance}
                      onChange={handleInputChange}
                      placeholder="例: 徒歩5分"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={calculateDistance}
                      disabled={isCalculatingDistance || !formData.nearest_station || !formData.store_address}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isCalculatingDistance ? '計算中...' : '自動計算'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    ※ 駅名と住所が入力されている場合、自動計算ボタンで徒歩時間を取得できます
                  </p>
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
                    placeholder="例: 090-1234-5678"
                    className={`mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                      phoneErrors.applicant_phone.length > 0 ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {phoneErrors.applicant_phone.length > 0 && (
                    <p className="text-sm text-red-600 mt-1">{phoneErrors.applicant_phone}</p>
                  )}
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