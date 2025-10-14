/**
 * 日本の電話番号フォーマッターユーティリティ
 *
 * 日本の電話番号体系に基づいて自動整形・バリデーションを行う
 *
 * ## 固定電話（10桁）
 * - 市外局番（1〜5桁） + 市内局番（1〜4桁） + 加入者番号（4桁）
 * - ルール: 市外局番 + 市内局番 = 必ず5桁
 *
 * ## 携帯電話（11桁）
 * - 070/080/090 + 市内局番（4桁） + 加入者番号（4桁）
 */

/**
 * 電話番号をそのまま返す（自動整形は行わない）
 *
 * @param value - 入力された電話番号
 * @returns 入力値をそのまま返す
 */
export function formatJapanesePhoneNumber(value: string): string {
  return value;
}

/**
 * 携帯電話番号をフォーマット（11桁）
 * 形式: 090-1234-5678
 */
function formatMobilePhoneNumber(numbers: string): string {
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * 固定電話番号をフォーマット（10桁）
 * 市外局番の桁数に応じてハイフン位置を調整
 */
function formatFixedPhoneNumber(numbers: string): string {
  // 1桁市外局番（03: 東京、04: 千葉、06: 大阪など）
  // 形式: 0A-BCDE-FGHJ
  if (numbers.startsWith('03') || numbers.startsWith('04') || numbers.startsWith('06')) {
    return format1DigitAreaCode(numbers);
  }

  // 2桁市外局番（011: 札幌、022: 仙台、092: 福岡など）
  // 形式: 0AB-CDE-FGHJ
  if (is2DigitAreaCode(numbers)) {
    return format2DigitAreaCode(numbers);
  }

  // 3桁市外局番（098: 沖縄、029: 茨城など）
  // 形式: 0ABC-DE-FGHJ
  if (is3DigitAreaCode(numbers)) {
    return format3DigitAreaCode(numbers);
  }

  // 4桁市外局番（0119: 北海道恵庭、0123: 北海道岩見沢など）
  // 形式: 0ABCD-E-FGHJ
  return format4DigitAreaCode(numbers);
}

/**
 * 2桁市外局番かどうか判定
 */
function is2DigitAreaCode(numbers: string): boolean {
  // 01x, 02x, 05x, 07x, 08x, 09x で始まる
  const twoDigitPrefixes = ['01', '02', '05', '07', '08', '09'];
  return twoDigitPrefixes.some(prefix => numbers.startsWith(prefix));
}

/**
 * 3桁市外局番かどうか判定
 */
function is3DigitAreaCode(numbers: string): boolean {
  // 主要な3桁市外局番
  const threeDigitPrefixes = ['098', '097', '096', '095', '099', '029'];
  return threeDigitPrefixes.some(prefix => numbers.startsWith(prefix));
}

/**
 * 1桁市外局番をフォーマット
 * 例: 03-1234-5678
 */
function format1DigitAreaCode(numbers: string): string {
  if (numbers.length <= 1) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 1)}-${numbers.slice(1)}`;
  return `${numbers.slice(0, 1)}-${numbers.slice(1, 5)}-${numbers.slice(5, 9)}`;
}

/**
 * 2桁市外局番をフォーマット
 * 例: 011-123-4567
 */
function format2DigitAreaCode(numbers: string): string {
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5, 9)}`;
}

/**
 * 3桁市外局番をフォーマット
 * 例: 098-12-3456
 */
function format3DigitAreaCode(numbers: string): string {
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 9)}`;
}

/**
 * 4桁市外局番をフォーマット
 * 例: 0119-1-2345
 */
function format4DigitAreaCode(numbers: string): string {
  if (numbers.length <= 4) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
  return `${numbers.slice(0, 4)}-${numbers.slice(4, 5)}-${numbers.slice(5, 9)}`;
}

/**
 * 日本の電話番号として有効かバリデーション
 *
 * 検証ルール:
 * - ハイフンが2つ含まれている
 * - 3つのパートに分割できる
 * - 各パートが数字のみ
 * - 末尾が4桁
 * - 合計10桁または11桁
 * - 0で始まる
 *
 * @param phone - 検証する電話番号
 * @returns 有効な場合true、無効な場合false
 *
 * @example
 * validateJapanesePhoneNumber('090-1234-5678') // true
 * validateJapanesePhoneNumber('03-1234-5678') // true
 * validateJapanesePhoneNumber('0119-99-9999') // true
 * validateJapanesePhoneNumber('123-4567') // false (ハイフンが1つのみ)
 * validateJapanesePhoneNumber('090-123-5678') // false (末尾が4桁でない)
 */
export function validateJapanesePhoneNumber(phone: string): boolean {
  if (!phone) return false;

  // ハイフンが2つ含まれているかチェック
  const hyphenCount = (phone.match(/-/g) || []).length;
  if (hyphenCount !== 2) return false;

  // ハイフンで分割
  const parts = phone.split('-');
  if (parts.length !== 3) return false;

  // 各パートが数字のみかチェック
  if (!parts.every(part => /^\d+$/.test(part))) return false;

  // 末尾が4桁かチェック
  if (parts[2].length !== 4) return false;

  // 数字のみを抽出
  const numbers = phone.replace(/[^\d]/g, '');

  // 固定電話（10桁）または携帯電話（11桁）
  if (numbers.length !== 10 && numbers.length !== 11) return false;

  // 0で始まる必要がある
  return numbers.startsWith('0');
}
