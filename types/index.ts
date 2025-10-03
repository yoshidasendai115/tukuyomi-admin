// 店舗編集申請
export interface StoreEditRequest {
  id: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  business_type?: 'girls_bar' | 'snack' | 'concept_cafe' | 'other';
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  applicant_role: string;
  business_license?: string;
  additional_info?: string;
  document_type?: string;
  business_license_image?: string;
  additional_document_type?: string;
  additional_document_image?: string;
  identity_document_image?: string;
  license_holder_name?: string;
  applicant_relationship?: string;
  document_verification_status?: 'pending' | 'verified' | 'rejected';
  store_id?: string; // 関連する店舗のID
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  admin_notes?: string;
  rejection_reason?: string;
  reviewed_by?: string;
  processed_by?: string;
  processed_at?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // 関連する店舗データ（比較表示用）
  related_store?: Store;
}

// 編集トークン
export interface StoreEditToken {
  id: string;
  request_id: string;
  store_id: string;
  token: string;
  pin_code: string;
  expires_at: string;
  max_uses: number;
  use_count: number;
  last_used_at?: string;
  is_active: boolean;
  failed_attempts: number;
  locked_until?: string;
  created_at: string;
  created_by: string;
}

// 管理者ユーザー
export interface AdminUser {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 店舗データ
export interface Store {
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

// エリアマスター
export interface Area {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

// ジャンルマスター
export interface Genre {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}
