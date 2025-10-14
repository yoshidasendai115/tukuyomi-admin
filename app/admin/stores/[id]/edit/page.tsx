'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { setAllowedUrl, getAllowedUrl, fetchWithAuth } from '@/lib/fetch-with-auth';
import { formatJapanesePhoneNumber, validateJapanesePhoneNumber } from '@/lib/utils/phoneFormatter';


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
  // 立地・アクセス
  nearest_station?: string;
  station?: string;
  station_route?: string;
  station_line?: string;
  station_distance?: string;
  google_place_id?: string;
  google_maps_uri?: string;
  latitude?: number;
  longitude?: number;
  // 営業情報
  seating_capacity?: string;
  payment_methods?: string;
  // その他の基本情報
  price_level?: string;
  catch_copy?: string;
  // SNS・Web
  website?: string;
  sns_instagram?: string;
  sns_twitter?: string;
  sns_tiktok?: string;
  rating?: number;
  review_count?: number;
  area?: string;
  features?: string[];
  genre?: string;
  opening_hours_text?: string[];
  tags?: string[];
  view_count?: number;
  owner_id?: string;
  // 連絡先情報（がるなび運営用）
  email?: string;
  line_id?: string;
  contact_phone_for_ga?: string;
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
  penalty_system?: string;
  back_rate?: string;
  dormitory_available?: boolean;
  dormitory_details?: string;
  daycare_available?: boolean;
  daycare_details?: string;
  trial_period?: string;
  trial_conditions?: string;
  interview_location?: string;
  interview_flow?: string;
  last_updated_by?: string;
  favorite_count?: number;
  application_count?: number;
  subscription_plan_id?: number;
  plan_started_at?: string;
  plan_expires_at?: string;
  plan_history?: any[];
  max_images_allowed?: number;
  verified_at?: string;
  verified_by?: string;
  custom_notes?: string;
  custom_memo?: string;
  image_url?: string;
  additional_images?: string[];
  accessible_stations?: any;
  // 優先表示関連
  is_recommended?: boolean;
  recommendation_reason?: string;
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

interface PageProps {
  params: Promise<{ id: string }>;
}

function AdminStoreEditPageContent({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storeId, setStoreId] = useState<string>('');
  const [paramsLoaded, setParamsLoaded] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [requireAuth, setRequireAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // プラン操作確認モーダル用の状態
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [planStartDate, setPlanStartDate] = useState<string>('');
  const [planEndDate, setPlanEndDate] = useState<string>('');
  const [planCancelDate, setPlanCancelDate] = useState<string>('');

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

  // プラン情報
  const [subscriptionPlans, setSubscriptionPlans] = useState<Array<{
    id: string;
    name: string;
    display_name: string;
    price: number;
    description?: string;
    display_order: number;
  }>>([]);

  // 距離計算
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  // ユーザーロール管理
  const [userRole, setUserRole] = useState<string>('');
  const isStoreOwner = userRole === 'store_owner';

  // Freeプラン判定ヘルパー関数
  const isFreeplan = (): boolean => {
    // subscription_plan_id が 1 (Free) の場合true
    return formData.subscription_plan_id === 1;
  };

  // プラン期限切れ判定ヘルパー関数
  const isPlanExpired = (formData: Partial<Store>): boolean => {
    if (
      typeof formData.subscription_plan_id === 'undefined' ||
      formData.subscription_plan_id === null ||
      formData.subscription_plan_id === 0
    ) {
      return false;
    }

    if (
      typeof formData.plan_expires_at === 'undefined' ||
      formData.plan_expires_at === null
    ) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(formData.plan_expires_at);
    return now > expiresAt;
  };

  useEffect(() => {
    // Paramsを展開
    params.then((p) => {
      setStoreId(p.id);
      setParamsLoaded(true);
    });
  }, [params]);

  useEffect(() => {
    if (paramsLoaded && storeId) {
      checkAuthAndFetchStore();
    }
  }, [storeId, paramsLoaded]);

  // subscription_plansデータを取得
  useEffect(() => {
    const fetchSubscriptionPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('id, name, display_name, price, description, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching subscription plans:', error);
          return;
        }

        setSubscriptionPlans(data || []);
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
      }
    };

    fetchSubscriptionPlans();
  }, []);

  const checkAuthAndFetchStore = async () => {
    try {
      // セッション確認とロール取得
      const sessionRes = await fetch('/api/auth/session');

      if (!sessionRes.ok) {
        console.error('Admin authentication required');
        router.push('/admin/login');
        return;
      }

      const sessionData = await sessionRes.json();

      if (!sessionData || !sessionData.userId) {
        console.error('No valid admin session');
        router.push('/admin/login');
        return;
      }

      // ロールを設定
      setUserRole(sessionData.role || '');

      // store_ownerの場合、sessionStorageに許可URLを保存
      if (sessionData.role === 'store_owner' && sessionData.allowedUrl) {
        setAllowedUrl(sessionData.allowedUrl);
        console.log('[StoreEdit] Allowed URL saved:', sessionData.allowedUrl);
      }

      setIsAuthenticated(true);
      setIsValidToken(true);

      // 店舗情報の取得
      await fetchStoreData(storeId);
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsValidToken(false);
      setIsLoading(false);
    }
  };

  const fetchStoreData = async (targetStoreId: string) => {
    try {
      console.log('[fetchStoreData] Fetching store:', targetStoreId);
      // 店舗情報を取得
      const response = await fetch(`/api/stores/${targetStoreId}`, {
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch store');
        throw new Error('Failed to fetch store');
      }

      const storeData = await response.json();


      // マスターデータ取得
      const masterResponse = await fetch('/api/masters/data');
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
      console.error('Error fetching store:', error);
      setIsValidToken(false);
    } finally {
      setIsLoading(false);
    }
  };


  // URLとして有効かチェック
  const isValidURL = (url: string): boolean => {
    if (!url) return true; // 空の場合はOK
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
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
      // 電話番号フィールドの場合は自動整形
      let processedValue = value;
      if (name === 'phone_number' || name === 'contact_phone_for_ga') {
        processedValue = formatJapanesePhoneNumber(value);
      }

      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }

    // priority_scoreは削除済み（subscription_plan_idを使用）

    // 駅名入力時のサジェスト表示
    if (name === 'station') {
      if (value.length > 0 && masterData.stations) {
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
      if (value.length > 0 && masterData.railwayLines) {
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

  const calculateDistance = async () => {
    const station = formData.station;
    const address = formData.address;

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
    console.log('Admin mode: fetching favorite users count');
    try {
      const response = await fetch(`/api/admin/favorite-count?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setFavoriteUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching favorite count in admin mode:', error);
    }
  };

  // メッセージ送信履歴を取得
  const fetchMessageHistory = async (storeId: string) => {
    try {
      const response = await fetch(`/api/admin/broadcast-message?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setMessageHistory(data.messages || []);
      } else {
        console.error('Failed to fetch message history:', response.statusText);
        setMessageHistory([]);
      }
    } catch (error) {
      console.error('Error fetching message history:', error);
      setMessageHistory([]);
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
      const response = await fetch('/api/admin/cancel-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broadcastId,
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

    // バリデーション: タイトルの文字数チェック
    if (messageTitle.length > 20) {
      alert(`タイトルは20文字以内で入力してください。\n現在: ${messageTitle.length}文字（${messageTitle.length - 20}文字オーバー）`);
      return;
    }

    // バリデーション: 本文の文字数チェック
    if (messageContent.length > 50) {
      alert(`本文は50文字以内で入力してください。\n現在: ${messageContent.length}文字（${messageContent.length - 50}文字オーバー）`);
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
      const response = await fetch('/api/admin/broadcast-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: store?.id,
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

    // バリデーション: 店舗名の文字数チェック
    if (formData.name && formData.name.length > 30) {
      alert(`店舗名は30文字以内で入力してください。\n現在: ${formData.name.length}文字（${formData.name.length - 30}文字オーバー）`);
      return;
    }

    // バリデーション: 店舗説明の文字数チェック
    if (formData.description && formData.description.length > 50) {
      alert(`店舗説明は50文字以内で入力してください。\n現在: ${formData.description.length}文字（${formData.description.length - 50}文字オーバー）`);
      return;
    }

    // バリデーション: 電話番号のチェック
    if (formData.phone_number && !validateJapanesePhoneNumber(formData.phone_number)) {
      alert('電話番号の形式が正しくありません。\n\n正しい形式:\n・ハイフンを2つ含む\n・末尾は4桁\n・例: 03-1234-5678、090-1234-5678、0119-99-9999');
      return;
    }

    if (formData.contact_phone_for_ga && !validateJapanesePhoneNumber(formData.contact_phone_for_ga)) {
      alert('連絡用電話番号の形式が正しくありません。\n\n正しい形式:\n・ハイフンを2つ含む\n・末尾は4桁\n・例: 03-1234-5678、090-1234-5678、0119-99-9999');
      return;
    }

    // バリデーション: URLのチェック
    if (formData.website && !isValidURL(formData.website)) {
      alert('Webサイトの形式が正しくありません。\nhttp:// または https:// で始まる正しいURLを入力してください。');
      return;
    }

    if (formData.sns_instagram && !isValidURL(formData.sns_instagram)) {
      alert('InstagramのURLの形式が正しくありません。\nhttp:// または https:// で始まる正しいURLを入力してください。');
      return;
    }

    if (formData.sns_twitter && !isValidURL(formData.sns_twitter)) {
      alert('X (Twitter)のURLの形式が正しくありません。\nhttp:// または https:// で始まる正しいURLを入力してください。');
      return;
    }

    if (formData.sns_tiktok && !isValidURL(formData.sns_tiktok)) {
      alert('TikTokのURLの形式が正しくありません。\nhttp:// または https:// で始まる正しいURLを入力してください。');
      return;
    }

    setIsSaving(true);

    try {
      let updatedFormData = { ...formData };

      // subscription_plan_idに基づいてis_recommendedを自動設定
      updatedFormData.is_recommended = (formData.subscription_plan_id === 3 || formData.subscription_plan_id === 5);

      // Freeプランの場合、追加画像をクリア
      if (isFreeplan()) {
        updatedFormData.additional_images = [];
      }

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

      // 管理者権限で直接APIを使って更新
      const response = await fetch(`/api/stores/${store?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFormData),
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

  // 今日の日付を取得（YYYY-MM-DD形式）
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // プラン適用開始ハンドラー（モーダル表示）
  const handleActivatePlan = () => {
    if (
      typeof formData.subscription_plan_id === 'undefined' ||
      formData.subscription_plan_id === null ||
      formData.subscription_plan_id === 0
    ) {
      alert('プランが選択されていません');
      return;
    }
    setPlanStartDate(getTodayDateString());
    setPlanEndDate(''); // 終了日はクリア（未設定=無期限）
    setShowActivateModal(true);
  };

  // プラン適用開始確定処理
  const confirmActivatePlan = async () => {
    if (!store) {
      throw new Error('店舗情報が存在しません');
    }

    if (!planStartDate) {
      alert('プラン適用開始日を選択してください');
      return;
    }

    setShowActivateModal(false);
    setIsSaving(true);
    try {
      const updateData = {
        subscription_plan_id: formData.subscription_plan_id,
        plan_started_at: new Date(planStartDate).toISOString(),
        plan_expires_at: planEndDate ? new Date(planEndDate).toISOString() : null
      };

      const response = await fetch(`/api/stores/${store.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert('プランの適用を開始しました');
        // データを再読み込み
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`プラン適用に失敗しました: ${error.message || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Error activating plan:', error);
      alert('プラン適用に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  // プラン解約ハンドラー（モーダル表示）
  const handleCancelPlan = () => {
    setPlanCancelDate(getTodayDateString());
    setShowCancelModal(true);
  };

  // プラン解約確定処理
  const confirmCancelPlan = async () => {
    if (!store) return;

    if (!planCancelDate) {
      alert('プラン解約日を選択してください');
      return;
    }

    setShowCancelModal(false);
    setIsSaving(true);
    try {
      const updateData = {
        subscription_plan_id: 0,
        plan_started_at: null,
        plan_expires_at: new Date(planCancelDate).toISOString()
      };

      const response = await fetch(`/api/stores/${store.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert('プランを解約しました');
        // データを再読み込み
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`プラン解約に失敗しました: ${error.message || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Error canceling plan:', error);
      alert('プラン解約に失敗しました。もう一度お試しください。');
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
    // { id: 'location', label: '立地・アクセス' }, // 基本情報に統合
    // { id: 'business', label: '営業情報' }, // 基本情報に統合
    { id: 'images', label: '画像' },
    { id: 'contact', label: '連絡先' },
    // { id: 'recruitment', label: '求人情報' }, // 非表示
    // { id: 'welfare', label: '福利厚生' }, // 非表示
    // { id: 'sns', label: 'SNS・Web' }, // 基本情報に統合
    { id: 'message', label: 'お知らせ配信' },
    // store_ownerロール以外はプラン設定タブを表示
    ...(!isStoreOwner ? [{ id: 'priority', label: 'プラン設定' }] : [])
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

  // 管理者権限モード（アクセスモードから判定済み）

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">店舗情報編集</h1>
                <p className="mt-2 text-sm text-gray-600">
                  {formData.name} の店舗情報を編集できます
                </p>
              </div>
              <div className="flex gap-2">
                {/* store_ownerロール以外は一覧に戻るボタンを表示 */}
                {!isStoreOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentParams = searchParams.toString();
                      const returnUrl = currentParams ? `/admin/stores?${currentParams}` : '/admin/stores';
                      router.push(returnUrl);
                    }}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    一覧に戻る
                  </button>
                )}
                {/* store_ownerロールの場合はログアウトボタンを表示 */}
                {isStoreOwner && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        router.push('/admin/login');
                      } catch (error) {
                        console.error('Logout error:', error);
                      }
                    }}
                    className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  >
                    ログアウト
                  </button>
                )}
                {/* 更新ボタンを上部に配置 */}
                <button
                  type="submit"
                  form="store-edit-form"
                  disabled={isSaving}
                  className={`px-6 py-2 text-white rounded-md ${
                    isSaving
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isSaving ? '更新中...' : '更新'}
                </button>
              </div>
            </div>
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

          <form id="store-edit-form" onSubmit={handleSubmit} className="p-6">
            {/* 基本情報タブ */}
            {activeTab === 'basic' && (
              <div className="space-y-8">
                {/* 基本情報セクション */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        店舗説明
                      </label>
                      <textarea
                        name="description"
                        value={formData.description || ''}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="店舗の特徴や魅力を記入"
                      />
                      <p className={`mt-1 text-xs ${
                        (formData.description || '').length > 50
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-500'
                      }`}>
                        {(formData.description || '').length > 50
                          ? `${(formData.description || '').length}/50文字（${(formData.description || '').length - 50}文字オーバー）`
                          : `${(formData.description || '').length}/50文字`}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        住所 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address || ''}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 立地・アクセスセクション */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">立地・アクセス</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                  onClick={() => handleStationSelect(station)}
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
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          name="station_distance"
                          value={formData.station_distance || ''}
                          onChange={handleInputChange}
                          placeholder="例: 徒歩5分"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={calculateDistance}
                          disabled={isCalculatingDistance || !formData.station || !formData.address}
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

                {/* 営業情報セクション */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">営業情報</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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


                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        電話番号（ハイフン必須）
                      </label>
                      <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="03-1234-5678"
                      />
                      <p className="text-xs text-gray-500 mt-1">※ お客様向けに掲載される電話番号です（例: 03-1234-5678、090-1234-5678）</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        座席数
                      </label>
                      <input
                        type="text"
                        name="seating_capacity"
                        value={formData.seating_capacity || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="例: 30席（カウンター10席、テーブル20席）"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        支払い方法
                      </label>
                      <input
                        type="text"
                        name="payment_methods"
                        value={formData.payment_methods || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="例: 現金、クレジットカード（VISA、MasterCard、JCB）、PayPay"
                      />
                    </div>
                  </div>
                </div>

                {/* SNS・Webセクション */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">SNS・Web</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instagram
                      </label>
                      <input
                        type="url"
                        name="sns_instagram"
                        value={formData.sns_instagram || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://instagram.com/username"
                      />
                    </div>

                    {/* Facebookフィールドは将来的に追加予定
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Facebook
                      </label>
                      <input
                        type="url"
                        name="facebook"
                        value={formData.facebook || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://facebook.com/pagename"
                      />
                    </div>
                    */}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        X (Twitter)
                      </label>
                      <input
                        type="url"
                        name="sns_twitter"
                        value={formData.sns_twitter || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://x.com/username"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LINE
                      </label>
                      <input
                        type="text"
                        name="line_id"
                        value={formData.line_id || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="LINE ID"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TikTok
                      </label>
                      <input
                        type="url"
                        name="sns_tiktok"
                        value={formData.sns_tiktok || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://tiktok.com/@username"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
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
                                onClick={() => handleStationSelect(station)}
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
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        name="station_distance"
                        value={formData.station_distance || ''}
                        onChange={handleInputChange}
                        placeholder="例: 徒歩5分"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={calculateDistance}
                        disabled={isCalculatingDistance || !formData.station || !formData.address}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isCalculatingDistance ? '計算中...' : '自動計算'}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      ※ 駅名と住所が入力されている場合、自動計算ボタンで徒歩時間を取得できます
                    </p>
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

                {!isFreeplan() && (
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
                )}

                {isFreeplan() && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      💵 <strong>Freeプラン</strong>ではメイン画像のみアップロード可能です。
                      <br />
                      追加画像をアップロードするには、有料プランへのアップグレードが必要です。
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 連絡先タブ */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <p className="text-sm text-yellow-700">
                    <strong>ご注意：</strong>こちらの連絡先情報は株式会社GAから店舗様へご連絡する際に使用いたします。
                    お客様向けの連絡先は「基本情報」タブの営業情報セクションにてご登録ください。
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      連絡用電話番号（ハイフン必須）
                    </label>
                    <input
                      type="tel"
                      name="contact_phone_for_ga"
                      value={formData.contact_phone_for_ga || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="03-9876-5432"
                    />
                    <p className="text-xs text-gray-500 mt-1">※ がるなび運営から店舗様への連絡用電話番号</p>
                  </div>

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
                      placeholder="contact@example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">※ がるなび運営からの重要なご連絡に使用します</p>
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
                      placeholder="@store_contact"
                    />
                    <p className="text-xs text-gray-500 mt-1">※ がるなび運営からの迅速なご連絡に使用します</p>
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
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
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
                      <p className={`mt-1 text-xs ${
                        messageTitle.length > 20
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-500'
                      }`}>
                        {messageTitle.length > 20
                          ? `${messageTitle.length}/20文字（${messageTitle.length - 20}文字オーバー）`
                          : `${messageTitle.length}/20文字`}
                      </p>
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
                      <p className={`mt-1 text-xs ${
                        messageContent.length > 50
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-500'
                      }`}>
                        {messageContent.length > 50
                          ? `${messageContent.length}/50文字（${messageContent.length - 50}文字オーバー）`
                          : `${messageContent.length}/50文字`}
                      </p>
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
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
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
                                    type="button"
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

            {/* プラン設定タブ - システム管理者専用 */}
            {activeTab === 'priority' && !isStoreOwner && (
              <div className="space-y-6">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        システム管理者専用設定
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>この設定は管理者権限でのみ変更可能です。プラン設定は全ユーザーの検索結果に影響します。</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* プラン期限切れ警告 */}
                  {isPlanExpired(formData) && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            プランが期限切れです
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>
                              期限: {formData.plan_expires_at && new Date(formData.plan_expires_at).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="mt-1">
                              現在のプランは無効になっています。新しいプランを設定してください。
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* プラン選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      プラン
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                      {subscriptionPlans.map((plan) => {
                        // nameからpriority_scoreへのマッピング
                        const getPriorityScore = (name: string): number => {
                          const mapping: Record<string, number> = {
                            'free': 0,
                            'light': 1,
                            'basic': 2,
                            'premium5': 3,
                            'premium10': 4,
                            'premium15': 5
                          };
                          return mapping[name] ?? 0;
                        };

                        // プランアイコンのマッピング
                        const getPlanIcon = (name: string): string => {
                          const iconMapping: Record<string, string> = {
                            'free': '',
                            'light': '🥉',
                            'basic': '🥈',
                            'premium5': '💎',
                            'premium10': '🥇',
                            'premium15': '👑'
                          };
                          return iconMapping[name] ?? '';
                        };

                        // プランカラーのマッピング
                        const getPlanColors = (name: string) => {
                          const colorMapping: Record<string, { active: string; inactive: string; radio: string }> = {
                            'free': {
                              active: 'border-blue-500 bg-blue-50 shadow-md',
                              inactive: 'border-gray-300 bg-white hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm',
                              radio: 'border-blue-500 bg-blue-500'
                            },
                            'light': {
                              active: 'border-amber-600 bg-amber-50 shadow-md',
                              inactive: 'border-gray-300 bg-white hover:border-amber-400 hover:bg-amber-50/30 hover:shadow-sm',
                              radio: 'border-amber-700 bg-amber-700'
                            },
                            'basic': {
                              active: 'border-gray-500 bg-gray-100 shadow-md',
                              inactive: 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 hover:shadow-sm',
                              radio: 'border-gray-600 bg-gray-600'
                            },
                            'premium5': {
                              active: 'border-cyan-500 bg-cyan-50 shadow-md',
                              inactive: 'border-gray-300 bg-white hover:border-cyan-400 hover:bg-cyan-50/30 hover:shadow-sm',
                              radio: 'border-cyan-600 bg-cyan-600'
                            },
                            'premium10': {
                              active: 'border-yellow-500 bg-yellow-50 shadow-md',
                              inactive: 'border-gray-300 bg-white hover:border-yellow-400 hover:bg-yellow-50/30 hover:shadow-sm',
                              radio: 'border-yellow-600 bg-yellow-600'
                            },
                            'premium15': {
                              active: 'border-purple-500 bg-purple-50 shadow-md',
                              inactive: 'border-gray-300 bg-white hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-sm',
                              radio: 'border-purple-600 bg-purple-600'
                            }
                          };
                          return colorMapping[name] ?? colorMapping['free'];
                        };

                        // 価格表示のフォーマット
                        const formatPrice = (price: number): string => {
                          if (price === 0) return '無料';
                          return `月${price.toLocaleString()}円`;
                        };

                        const icon = getPlanIcon(plan.name);
                        const colors = getPlanColors(plan.name);
                        const priceDisplay = formatPrice(plan.price);
                        const isSelected = formData.subscription_plan_id === Number(plan.id);

                        // プランが適用済みかチェック（plan_started_atが設定されている）
                        const isPlanActive = (
                          typeof formData.plan_started_at !== 'undefined' &&
                          formData.plan_started_at !== null &&
                          formData.plan_started_at !== ''
                        );
                        // 他のプランが適用済みの場合は非活性化
                        const isDisabled = isPlanActive && !isSelected;

                        return (
                          <div
                            key={plan.id}
                            className={`border-2 rounded-lg p-4 transition-all relative ${
                              isSelected ? colors.active : colors.inactive
                            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            onClick={() => {
                              if (isDisabled) return;
                              // プラン選択のみ（適用開始はボタンで行う）
                              setFormData(prev => ({
                                ...prev,
                                subscription_plan_id: Number(plan.id),
                              }));
                            }}
                          >
                            <div className="absolute top-3 right-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? colors.radio : 'border-gray-400 bg-white'
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1">
                              {plan.display_name} {icon && <span className="text-base">{icon}</span>}
                            </h3>
                            <p className="text-2xl font-bold mt-1 text-gray-900">{priceDisplay}</p>
                            {plan.description && (
                              <ul className="text-xs text-gray-600 mt-2 space-y-0.5">
                                <li>• {plan.description}</li>
                              </ul>
                            )}
                            {formData.subscription_plan_id === Number(plan.id) && formData.plan_started_at && (
                              <div className="mt-3 pt-3 border-t text-xs text-gray-600 space-y-1">
                                <div className="flex justify-between">
                                  <span>開始:</span>
                                  <span className="font-medium">
                                    {new Date(formData.plan_started_at).toLocaleDateString('ja-JP')}
                                  </span>
                                </div>
                                {formData.plan_expires_at && (
                                  <div className="flex justify-between">
                                    <span>終了:</span>
                                    <span className={`font-medium ${isPlanExpired(formData) ? 'text-red-600' : 'text-gray-900'}`}>
                                      {new Date(formData.plan_expires_at).toLocaleDateString('ja-JP')}
                                      {isPlanExpired(formData) && ' (期限切れ)'}
                                    </span>
                                  </div>
                                )}
                                {!formData.plan_expires_at && (
                                  <div className="flex justify-between">
                                    <span>終了:</span>
                                    <span className="font-medium text-green-600">無期限</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-sm text-gray-500">
                      ※ 同じプラン内ではランダムに表示されます
                    </p>

                    {/* プラン適用開始・解約ボタン */}
                    <div className="mt-6 flex gap-3">
                      {/* プラン適用開始ボタン */}
                      {(
                        typeof formData.subscription_plan_id !== 'undefined' &&
                        formData.subscription_plan_id !== null &&
                        formData.subscription_plan_id !== 0 &&
                        (
                          typeof formData.plan_started_at === 'undefined' ||
                          formData.plan_started_at === null ||
                          formData.plan_started_at === ''
                        )
                      ) && (
                        <button
                          type="button"
                          onClick={handleActivatePlan}
                          disabled={isSaving}
                          className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                        >
                          {isSaving ? '処理中...' : 'プラン適用開始'}
                        </button>
                      )}

                      {/* 解約ボタン */}
                      {(
                        typeof formData.subscription_plan_id !== 'undefined' &&
                        formData.subscription_plan_id !== null &&
                        formData.subscription_plan_id !== 0 &&
                        typeof formData.plan_started_at !== 'undefined' &&
                        formData.plan_started_at !== null &&
                        formData.plan_started_at !== ''
                      ) && (
                        <button
                          type="button"
                          onClick={handleCancelPlan}
                          disabled={isSaving}
                          className="flex-1 bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                        >
                          {isSaving ? '処理中...' : 'プランを解約'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* プラン履歴 */}
                  {store?.plan_history && Array.isArray(store.plan_history) && store.plan_history.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">プラン契約履歴</h3>
                      <div className="bg-white rounded-lg border border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  操作
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  プラン名
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  開始日
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  終了日
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  記録日時
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  操作者
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {[...store.plan_history].reverse().map((history: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      history.action === 'activated'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {history.action === 'activated' ? '適用開始' : '解約'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {history.plan_name}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {history.started_at ? new Date(history.started_at).toLocaleDateString('ja-JP') : '-'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {history.ended_at ? new Date(history.ended_at).toLocaleDateString('ja-JP') : '無期限'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {new Date(history.created_at).toLocaleString('ja-JP', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {history.created_by || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 内部メモ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      内部メモ
                    </label>
                    <textarea
                      name="recommendation_reason"
                      value={formData.recommendation_reason || ''}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="例: 新規オープンキャンペーン中、高評価レビュー多数、独自のサービスが人気"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      この情報は管理用で、ユーザーには表示されません
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* 更新ボタン（下部にも配置） */}
            <div className="flex justify-end mt-8 pt-6 border-t">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? '更新中...' : '更新'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* プラン適用開始確認モーダル */}
      {showActivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="ml-4 text-lg font-medium text-gray-900">
                  プラン適用開始の確認
                </h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-1">適用店舗</p>
                    <p className="font-medium text-gray-900">{formData.name || '店舗名未設定'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">適用プラン</p>
                    <p className="font-medium text-gray-900">
                      {subscriptionPlans.find((plan) => Number(plan.id) === formData.subscription_plan_id)
                        ? subscriptionPlans.find((plan) => Number(plan.id) === formData.subscription_plan_id)?.display_name
                        : '不明'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    プラン適用開始日 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    プランの適用を開始する日付を選択してください
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    プラン終了日（オプション）
                  </label>
                  <input
                    type="date"
                    value={planEndDate}
                    onChange={(e) => setPlanEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    未設定の場合は無期限となります
                  </p>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">以下の点をご確認ください</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>✓ クレジット決済処理は完了していますか？</li>
                        <li>✓ 適用店舗に誤りはありませんか？</li>
                        <li>✓ プラン内容に誤りはありませんか？</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  この操作により、プランの適用が開始されます。
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowActivateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmActivatePlan}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium"
                >
                  {isSaving ? '処理中...' : 'プラン適用を開始'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* プラン解約確認モーダル */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="ml-4 text-lg font-medium text-gray-900">
                  プラン解約の確認
                </h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-1">対象店舗</p>
                    <p className="font-medium text-gray-900">{formData.name || '店舗名未設定'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">現在のプラン</p>
                    <p className="font-medium text-gray-900">
                      {subscriptionPlans.find((plan) => Number(plan.id) === formData.subscription_plan_id)
                        ? subscriptionPlans.find((plan) => Number(plan.id) === formData.subscription_plan_id)?.display_name
                        : '不明'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    プラン解約日 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={planCancelDate}
                    onChange={(e) => setPlanCancelDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    プランを解約する日付を選択してください
                  </p>
                </div>

                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800 mb-2">重要な注意事項</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• プランを解約すると、Freeプランに戻ります</li>
                        <li>• この操作は取り消せません</li>
                        <li>• 優先表示などの特典がすべて無効になります</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  本当にプランを解約してもよろしいですか？
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmCancelPlan}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-medium"
                >
                  {isSaving ? '処理中...' : 'プランを解約する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminStoreEditPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <AdminStoreEditPageContent params={params} />
    </Suspense>
  );
}