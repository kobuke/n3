-- 1. surveys テーブルの作成（アンケート定義と質問リスト）
CREATE TABLE IF NOT EXISTS public.surveys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  nft_template_ids uuid[] DEFAULT '{}'::uuid[],
  is_active boolean DEFAULT false,
  max_answers_per_user integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. survey_responses テーブルの作成（ユーザーの回答記録）
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id uuid REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_wallet text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. notifications テーブルの作成（お知らせ一覧用）
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  link_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 【重要】 既存のテーブル構造をアップデートする場合は、以下のSQLを実行してください：
-- ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS max_answers_per_user integer DEFAULT 1;
-- ALTER TABLE public.survey_responses DROP CONSTRAINT IF EXISTS survey_responses_survey_id_user_email_key;
