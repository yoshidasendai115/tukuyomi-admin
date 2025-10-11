-- Create admin-documents storage bucket for store application documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'admin-documents',
  'admin-documents',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to files in admin-documents bucket
CREATE POLICY "Public read access for admin-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'admin-documents');

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to admin-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'admin-documents');

-- Policy: Allow service role to manage all files (for admin operations)
CREATE POLICY "Service role can manage admin-documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'admin-documents')
WITH CHECK (bucket_id = 'admin-documents');
