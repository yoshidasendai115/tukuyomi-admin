-- Add business hours columns to stores table
ALTER TABLE stores
ADD COLUMN hours_monday_open TIME,
ADD COLUMN hours_monday_close TIME,
ADD COLUMN hours_monday_closed BOOLEAN DEFAULT FALSE,
ADD COLUMN hours_tuesday_open TIME,
ADD COLUMN hours_tuesday_close TIME,
ADD COLUMN hours_tuesday_closed BOOLEAN DEFAULT FALSE,
ADD COLUMN hours_wednesday_open TIME,
ADD COLUMN hours_wednesday_close TIME,
ADD COLUMN hours_wednesday_closed BOOLEAN DEFAULT FALSE,
ADD COLUMN hours_thursday_open TIME,
ADD COLUMN hours_thursday_close TIME,
ADD COLUMN hours_thursday_closed BOOLEAN DEFAULT FALSE,
ADD COLUMN hours_friday_open TIME,
ADD COLUMN hours_friday_close TIME,
ADD COLUMN hours_friday_closed BOOLEAN DEFAULT FALSE,
ADD COLUMN hours_saturday_open TIME,
ADD COLUMN hours_saturday_close TIME,
ADD COLUMN hours_saturday_closed BOOLEAN DEFAULT FALSE,
ADD COLUMN hours_sunday_open TIME,
ADD COLUMN hours_sunday_close TIME,
ADD COLUMN hours_sunday_closed BOOLEAN DEFAULT FALSE;

-- Add comments for clarity
COMMENT ON COLUMN stores.hours_monday_open IS '月曜日開店時刻';
COMMENT ON COLUMN stores.hours_monday_close IS '月曜日閉店時刻';
COMMENT ON COLUMN stores.hours_monday_closed IS '月曜日休業フラグ';
COMMENT ON COLUMN stores.hours_tuesday_open IS '火曜日開店時刻';
COMMENT ON COLUMN stores.hours_tuesday_close IS '火曜日閉店時刻';
COMMENT ON COLUMN stores.hours_tuesday_closed IS '火曜日休業フラグ';
COMMENT ON COLUMN stores.hours_wednesday_open IS '水曜日開店時刻';
COMMENT ON COLUMN stores.hours_wednesday_close IS '水曜日閉店時刻';
COMMENT ON COLUMN stores.hours_wednesday_closed IS '水曜日休業フラグ';
COMMENT ON COLUMN stores.hours_thursday_open IS '木曜日開店時刻';
COMMENT ON COLUMN stores.hours_thursday_close IS '木曜日閉店時刻';
COMMENT ON COLUMN stores.hours_thursday_closed IS '木曜日休業フラグ';
COMMENT ON COLUMN stores.hours_friday_open IS '金曜日開店時刻';
COMMENT ON COLUMN stores.hours_friday_close IS '金曜日閉店時刻';
COMMENT ON COLUMN stores.hours_friday_closed IS '金曜日休業フラグ';
COMMENT ON COLUMN stores.hours_saturday_open IS '土曜日開店時刻';
COMMENT ON COLUMN stores.hours_saturday_close IS '土曜日閉店時刻';
COMMENT ON COLUMN stores.hours_saturday_closed IS '土曜日休業フラグ';
COMMENT ON COLUMN stores.hours_sunday_open IS '日曜日開店時刻';
COMMENT ON COLUMN stores.hours_sunday_close IS '日曜日閉店時刻';
COMMENT ON COLUMN stores.hours_sunday_closed IS '日曜日休業フラグ';