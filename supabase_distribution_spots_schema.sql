CREATE TABLE IF NOT EXISTS nft_distribution_spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES nft_templates(id),
    name TEXT NOT NULL,                -- 地点名（例：ハチ公前）
    description TEXT,                  -- ユーザー向け説明文
    slug TEXT UNIQUE,                  -- URL用スラッグ（例: shibuya-spot）
    
    -- 位置情報設定
    is_location_restricted BOOLEAN DEFAULT FALSE,
    latitude DOUBLE PRECISION,         -- 目標地点の緯度
    longitude DOUBLE PRECISION,        -- 目標地点の経度
    radius_meters INTEGER DEFAULT 100, -- 許容誤差範囲（メートル）

    -- 管理用
    is_active BOOLEAN DEFAULT TRUE,
    max_claims_total INTEGER,          -- スポット全体の総配布上限
    current_claims_total INTEGER DEFAULT 0, -- 現在の配布数
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) の設定
ALTER TABLE nft_distribution_spots ENABLE ROW LEVEL SECURITY;

-- 誰もが読み取り可能 (公開スポット情報として取得するため)
CREATE POLICY "Public spots are viewable by everyone."
  ON nft_distribution_spots FOR SELECT
  USING ( true );

-- 管理画面用ポリシー（すべての操作が可能）
CREATE POLICY "Admin full access spots"
  ON nft_distribution_spots FOR ALL
  USING ( true )
  WITH CHECK ( true );

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_nft_distribution_spots_updated_at ON nft_distribution_spots;
CREATE TRIGGER update_nft_distribution_spots_updated_at
    BEFORE UPDATE ON nft_distribution_spots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 既存のairdrop_claimsテーブルに spot_id カラムを追加（どのスポットから受け取ったかを記録するため）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='airdrop_claims' AND column_name='spot_id') THEN
        ALTER TABLE airdrop_claims ADD COLUMN spot_id UUID REFERENCES nft_distribution_spots(id) DEFAULT NULL;
    END IF;
END $$;

-- スポット経由での安全なミント実行処理（上限、在庫チェックを含む）
CREATE OR REPLACE FUNCTION claim_spot_airdrop_safe(p_template_id UUID, p_wallet_address TEXT, p_spot_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template_max_supply INTEGER;
    v_template_current_supply INTEGER;
    v_spot_max_claims INTEGER;
    v_spot_current_claims INTEGER;
BEGIN
    -- すでにこのテンプレートを受け取り済みか確認 (1アカウント1つまで)
    IF EXISTS (SELECT 1 FROM airdrop_claims WHERE template_id = p_template_id AND wallet_address = p_wallet_address) THEN
        RETURN json_build_object('success', false, 'error', 'ALREADY_CLAIMED');
    END IF;

    -- テンプレート在庫のロックと取得
    SELECT max_supply, current_supply 
    INTO v_template_max_supply, v_template_current_supply
    FROM nft_templates 
    WHERE id = p_template_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'TEMPLATE_NOT_FOUND');
    END IF;

    IF v_template_max_supply IS NOT NULL AND v_template_current_supply >= v_template_max_supply THEN
        RETURN json_build_object('success', false, 'error', 'OUT_OF_STOCK');
    END IF;

    -- スポットのロックと取得
    IF p_spot_id IS NOT NULL THEN
        SELECT max_claims_total, current_claims_total
        INTO v_spot_max_claims, v_spot_current_claims
        FROM nft_distribution_spots
        WHERE id = p_spot_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'SPOT_NOT_FOUND');
        END IF;

        IF v_spot_max_claims IS NOT NULL AND v_spot_current_claims >= v_spot_max_claims THEN
            RETURN json_build_object('success', false, 'error', 'SPOT_LIMIT_REACHED');
        END IF;

        -- スポットの受取数をインクリメント
        UPDATE nft_distribution_spots 
        SET current_claims_total = current_claims_total + 1 
        WHERE id = p_spot_id;
    END IF;

    -- テンプレートの供給数をインクリメント
    UPDATE nft_templates 
    SET current_supply = current_supply + 1 
    WHERE id = p_template_id;

    -- 受け取り履歴を登録
    INSERT INTO airdrop_claims (template_id, wallet_address, spot_id) 
    VALUES (p_template_id, p_wallet_address, p_spot_id);

    RETURN json_build_object('success', true);
END;
$$;
