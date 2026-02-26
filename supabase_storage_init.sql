-- Create "nft-images" bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('nft-images', 'nft-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'nft-images' );

-- Note: Our API route uses the service_role key to upload, 
-- which bypasses RLS policies, so we strictly only needed the public read policy.
