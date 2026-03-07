-- setup_quests.sql
-- Quest（スタンプラリー）機能のためのテーブル作成スクリプト

-- 1. quests テーブルの作成
CREATE TABLE IF NOT EXISTS public.quests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  base_nft_template_id uuid REFERENCES public.nft_templates(id), -- 参加証となるNFT
  is_sequential boolean DEFAULT false, -- 順番通りに回る必要があるか
  reward_nft_template_id uuid REFERENCES public.nft_templates(id), -- コンプリート報酬NFT（オプション）
  clear_metadata_uri text, -- コンプリート時の最終進化NFTメタデータURI（オプション）
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. quest_locations テーブルの作成（各チェックポイント）
CREATE TABLE IF NOT EXISTS public.quest_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id uuid REFERENCES public.quests(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0, -- 表示・判定時の順番
  name text NOT NULL,
  description text,
  lat double precision NOT NULL, -- 緯度
  lng double precision NOT NULL, -- 経度
  radius_meters integer NOT NULL DEFAULT 100, -- GPS判定の許容半径（メートル）
  levelup_metadata_uri text, -- この地点をクリアした際にNFTを変化させるメタデータURI（オプション）
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. user_quest_progress テーブルの作成（チェックイン記録）
CREATE TABLE IF NOT EXISTS public.user_quest_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id uuid REFERENCES public.quests(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.quest_locations(id) ON DELETE CASCADE,
  user_wallet text NOT NULL,
  scanned_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_wallet, quest_id, location_id) -- 1つの地点につき1人1回だけスキャン可能
);

-- アクセスポリシー等の設定（必要に応じて）
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_progress ENABLE ROW LEVEL SECURITY;

-- 全員（匿名含む）に対する読み取り（SELECT）許可ポリシー
CREATE POLICY "Enable read access for all users" ON quests FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON quest_locations FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON user_quest_progress FOR SELECT USING (true);

-- 管理者用やシステム（Service Role）用のフルアクセスはSupabase側でデフォルト許可されるため省略します
