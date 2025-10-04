/**
 * 店舗ユーザー用の認証付きfetchラッパー
 * リクエストヘッダーに許可されたURLを追加して送信
 */

const ALLOWED_URL_KEY = 'store_owner_allowed_url';

/**
 * sessionStorageに許可URLを保存
 */
export function setAllowedUrl(url: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(ALLOWED_URL_KEY, url);
  }
}

/**
 * sessionStorageから許可URLを取得
 */
export function getAllowedUrl(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(ALLOWED_URL_KEY);
  }
  return null;
}

/**
 * sessionStorageから許可URLを削除
 */
export function clearAllowedUrl(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(ALLOWED_URL_KEY);
  }
}

/**
 * 店舗ユーザー用の認証付きfetch
 * 許可URLをヘッダーに追加してリクエストを送信
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const allowedUrl = getAllowedUrl();

  const headers = new Headers(options.headers);

  // 許可URLが設定されている場合、ヘッダーに追加
  if (allowedUrl) {
    headers.set('X-Allowed-URL', allowedUrl);
  }

  return fetch(url, {
    ...options,
    headers
  });
}
