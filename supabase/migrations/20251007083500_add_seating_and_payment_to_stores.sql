-- storesテーブルにseating_capacityとpayment_methodsカラムを追加
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS seating_capacity TEXT,
ADD COLUMN IF NOT EXISTS payment_methods TEXT;

-- コメント追加
COMMENT ON COLUMN stores.seating_capacity IS '座席数';
COMMENT ON COLUMN stores.payment_methods IS '支払い方法';
