-- Add generated_password column to admin_store_edit_requests table
ALTER TABLE admin_store_edit_requests
ADD COLUMN IF NOT EXISTS generated_password TEXT;

COMMENT ON COLUMN admin_store_edit_requests.generated_password IS 'BkUŒ_Ñ¹ïüÉs‡	';
