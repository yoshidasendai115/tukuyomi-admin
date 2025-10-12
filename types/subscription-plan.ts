// プラン機能の型定義
export interface PlanFeatures {
  photos?: number;                    // 写真枚数
  ad_display?: boolean;               // 広告表示
  basic_info?: boolean;               // 基本情報掲載
  edit_access?: boolean;              // 管理画面編集権限
  priority_display?: string;          // 上位表示（light_green, cyan, silver, gold, gold_premium）
  review_pickup?: boolean;            // 口コミピックアップ
  commitments?: boolean;              // お店のこだわり欄
  events?: boolean;                   // イベント情報掲載
  nearby_stores?: boolean;            // 近くのお店表示
  golden_time?: string;               // ゴールデンタイム露出（3_per_week, 7_per_week, 14_per_week, 21_per_week）
  weekly_message?: number;            // 一斉メッセージ送信回数（週）
  message_plus?: boolean;             // 一斉メッセージ機能+（予約投稿、セグメント抽出）
  pv_report?: boolean;                // アクセス数レポート
  message_read_report?: boolean;      // メッセージ既読率レポート
  message_click_report?: boolean;     // メッセージクリック数レポート
  pr_article?: string;                // PR記事作成（1_per_month, 2_per_month）
  video_link?: boolean;               // 動画掲載リンク有効化
  video_editing?: string;             // 動画編集（1_per_month）
  video_shooting?: string;            // 動画撮影+編集（1_per_month, 2_per_month）
  concierge?: boolean;                // コンシェルジュプラン
  [key: string]: string | number | boolean | undefined;
}

// プランの型定義
export interface SubscriptionPlan {
  id: string;
  name: string;                       // プラン名（システム内部用）
  display_name: string;               // 表示名（ユーザー向け）
  price: number;                      // 月額料金（円）
  description: string | null;         // プラン説明
  features: PlanFeatures;             // 機能詳細
  display_order: number;              // 表示順
  is_active: boolean;                 // 有効/無効
  created_at: string;
  updated_at: string;
}

// プラン作成・更新用の入力型
export interface SubscriptionPlanInput {
  name: string;
  display_name: string;
  price: number;
  description?: string;
  features?: PlanFeatures;
  display_order?: number;
  is_active?: boolean;
}

// 店舗のプラン情報
export interface StorePlanInfo {
  subscription_plan_id: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  plan?: SubscriptionPlan | null;     // プラン詳細（JOIN時）
}

// プラン名の定数
export const PLAN_NAMES = {
  FREE: 'free',
  LIGHT: 'light',
  BASIC: 'basic',
  PREMIUM5: 'premium5',
  PREMIUM10: 'premium10',
  PREMIUM15: 'premium15',
} as const;

// プランの優先度表示色
export const PRIORITY_COLORS = {
  light_green: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    label: '黄緑',
  },
  cyan: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    border: 'border-cyan-300',
    label: '水色',
  },
  silver: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-400',
    label: '銀色',
  },
  gold: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-400',
    label: '金色',
  },
  gold_premium: {
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    border: 'border-amber-500',
    label: 'プレミアム金色',
  },
} as const;
