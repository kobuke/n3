# なんじょうNFTポータル

南城市NFT（沖縄リゾート デジタルチケット）専用のデジタルウォレット & 管理アプリケーション。  
NFTチケットの保有確認・使用(もぎり)に加え、Shopify連携によるNFT自動発行、SBT有効期限管理、スタンプラリー、アンケート、Discord連携によるロール付与、配布スポット（位置情報ベース）など、NFTエコシステム全体を一元管理できるWebアプリです。

---

## プロジェクト概要

- **目的**: NFT保有者が自身のチケットを簡単に確認・提示・使用でき、運営側がNFT発行からコミュニティ管理まで一元管理できる環境を提供する。
- **ターゲット**:
  - **利用者**: メールアドレスまたは外部ウォレットでNFTを受け取った観光客・市民
  - **スタッフ**: 管理者（NFT発行・テンプレート管理・Discord連携・Shopify連携・クエスト/アンケート管理）

---

## 主な機能

### 🏦 NFT発行基盤（Thirdweb Engine）
- **Shopify連携**: 商品購入時にWebhookを受信し、Thirdweb Engine経由で自動的にNFTをミント
- **スタッフ一括配布**: 管理画面からメールアドレスリストに対して一括エアドロップ
- **配布スポット**: QRコード＋位置情報による現地限定NFT配布（スポット上限・テンプレート上限に対応）
- **LINE連携配布**: LINEブラウザからのアクセス時に自動でNFTを配布
- **Dynamic NFT**: チケット使用時にオンチェーンのメタデータを更新し、外部プラットフォームでも「使用済み」として反映

### ⏱️ SBT有効期限管理
- **有効期限設定**: テンプレート単位で有効日数（例: 365日）を設定可能
- **オンチェーン記録**: ミント時に `Expires_At` 属性をメタデータに書き込み、ブロックチェーン上でも確認可能
- **更新フロー**: 期限切れSBTの詳細画面に「更新する」ボタンを表示し、Shopify商品ページへ遷移。再購入で有効期限が延長される
- **Discord同期**: 期限切れSBTの保有者はDiscordロールの剥奪対象に含まれる

### 🗺️ クエスト（スタンプラリー）
- スタッフがクエスト（チェックポイントの連続巡回）を作成・管理
- ユーザーが各地点のQRコードをスキャンして進行
- チェックポイント通過 / クエストクリア時にオンチェーンのNFTメタデータを動的に更新（画像・名前が変化）

### 📋 アンケート
- スタッフがアンケートを作成し、ユーザーに回答を促す
- 回答データをSupabaseに蓄積して管理可能

### 🎫 ユーザー向け機能

1. **ログイン / 認証**
   - **メール認証 (OTP)**: メールアドレスに6桁の認証コードを送信
   - **WalletConnect (AppKit)**: MetaMask等の外部ウォレットでの認証
   - **LINE認証**: LINE OAuth2によるシームレスなログイン
2. **マイページ**
   - NFTチケットの一覧表示（取得日・使用ステータス・有効期限付き）
   - 期限切れSBTのグレーアウト表示と「期限切れ」バッジ
   - チケット詳細ページ: 有効期限表示・「更新する」ボタン・譲渡リンク生成
   - クエスト進行状況確認
   - 通知センター
3. **配布スポットでのNFT受け取り**
   - QRコードスキャン → 位置情報確認 → NFT受取の一連のフロー
4. **クエスト参加** (`/quests/scan`)
   - QRコードスキャンでチェックポイントを記録
5. **アンケート回答** (`/surveys/[id]`)
   - アンケートフォームへの回答・送信
6. **Discord連携**
   - OAuth2認証によるDiscordサーバーへの自動参加 + NFTに応じたロール付与

### 🔧 スタッフ向け（`/staff/*`）

| ページ | 説明 |
|---|---|
| `/staff/dashboard` | ダッシュボード（ミント統計・システム概要） |
| `/staff/templates` | NFTテンプレート管理（SBT有効期限・更新URL設定） |
| `/staff/distribute` | メールアドレス指定でのNFT一括配布 |
| `/staff/spots` | 位置情報ベースの配布スポット作成・QRコード生成 |
| `/staff/mapping` | Shopify商品 ↔ NFTテンプレートの紐付け |
| `/staff/orders` | Shopify注文に基づくミント履歴 |
| `/staff/issued` | 配布済みNFT一覧 |
| `/staff/quests` | クエスト（スタンプラリー）の作成・管理 |
| `/staff/surveys` | アンケートの作成・管理 |
| `/staff/discord` | NFTテンプレート ↔ Discordロールのマッピング |
| `/staff/notifications` | 通知管理 |
| `/staff/audit` | 操作監査ログ |
| `/staff/settings` | 通知設定・LINE配布設定 |

---

## システム構成

### 技術スタック

| カテゴリ | 技術 |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v3, Shadcn UI, Lucide React |
| **認証** | Cookie-based Session, Email OTP (Resend), WalletConnect (AppKit/Reown), LINE OAuth2 |
| **Blockchain** | Thirdweb Engine (ERC-1155 NFT発行・管理), Thirdweb SDK v5 |
| **Database** | Supabase (PostgreSQL) |
| **Email** | Resend |
| **外部連携** | Discord API (OAuth2, Bot), Shopify Webhooks, LINE Login |
| **Hosting** | Netlify |

### ディレクトリ構造

```
.
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── distribute/             # NFT一括配布 (check-users を含む)
│   │   │   └── spots/[id]/             # 配布スポット CRUD
│   │   ├── airdrop/line/               # LINE連携自動配布
│   │   ├── auth/
│   │   │   ├── send-otp/               # OTP送信
│   │   │   ├── verify-otp/             # OTP検証
│   │   │   ├── discord/                # Discord OAuth2 (認証開始 + コールバック)
│   │   │   └── line/                   # LINE OAuth2 (認証開始 + connect + コールバック)
│   │   ├── dashboard/stats/            # ダッシュボード統計
│   │   ├── discord/
│   │   │   ├── roles/                  # Discordロールマッピング CRUD
│   │   │   ├── status/                 # Discord連携状態確認
│   │   │   └── sync/                   # Discordロール同期（期限切れSBT対応）
│   │   ├── drop/claim/                 # 配布スポット・テンプレートからのNFT受取
│   │   ├── line/status/                # LINE連携状態確認
│   │   ├── login/                      # ウォレット接続ログイン
│   │   ├── logout/                     # ログアウト
│   │   ├── logs/                       # ミントログ一覧
│   │   ├── mappings/                   # Shopify商品マッピング CRUD
│   │   ├── nfts/                       # NFT一覧取得（有効期限情報付き）
│   │   │   ├── [nftId]/                # NFT個別詳細
│   │   │   └── create/                 # テンプレート作成・更新
│   │   ├── notifications/              # 通知 CRUD
│   │   ├── products/                   # Shopify商品一覧
│   │   ├── quests/                     # クエスト CRUD
│   │   │   ├── [id]/                   # クエスト詳細・更新
│   │   │   │   └── locations/[locationId]/ # チェックポイント管理
│   │   │   └── scan/                   # QRスキャンによるチェックポイント記録
│   │   ├── session/                    # セッション確認
│   │   ├── settings/                   # アプリ設定
│   │   ├── spots/[id]/                 # 配布スポット公開API (GET)
│   │   ├── staff/
│   │   │   ├── issued/                 # 配布済みNFT一覧 (スタッフ用)
│   │   │   ├── login/                  # スタッフログイン
│   │   │   └── logout/                 # スタッフログアウト
│   │   ├── surveys/                    # アンケート CRUD
│   │   │   └── [id]/submit/            # アンケート回答送信
│   │   ├── templates/                  # NFTテンプレート一覧・CRUD
│   │   │   └── [id]/                   # テンプレート個別操作
│   │   ├── transfer/
│   │   │   ├── create-link/            # 譲渡リンク生成
│   │   │   └── claim/                  # 譲渡リンクからのNFT受取
│   │   ├── upload/                     # 画像アップロード
│   │   ├── users/activities/           # ユーザーアクティビティ
│   │   └── webhooks/
│   │       ├── shopify/                # Shopify注文Webhook受信
│   │       └── engine/                 # Thirdweb Engine Webhook受信（token_id後書き込み）
│   ├── claim/                          # 譲渡リンクのクレームページ
│   ├── drop/[templateId]/              # テンプレートベースの配布ページ
│   ├── guide/location/                 # 位置情報設定ガイド
│   ├── mypage/                         # ユーザーマイページ（NFT一覧）
│   │   ├── [nftId]/                    # NFT詳細（有効期限・更新ボタン表示）
│   │   ├── nfts/                       # NFT一覧タブ
│   │   ├── notifications/              # 通知センター
│   │   └── quests/                     # クエスト進行状況
│   ├── quests/scan/                    # クエストQRスキャンページ
│   ├── spot/[id]/                      # 配布スポット受取ページ
│   ├── staff/                          # スタッフ管理画面
│   │   ├── audit/                      # 操作監査ログ
│   │   ├── dashboard/
│   │   ├── discord/
│   │   ├── distribute/
│   │   ├── issued/                     # 配布済みNFT一覧
│   │   ├── mapping/
│   │   ├── notifications/
│   │   ├── orders/
│   │   ├── quests/                     # クエスト管理
│   │   │   └── [id]/locations/         # チェックポイント管理
│   │   ├── settings/
│   │   ├── spots/
│   │   ├── surveys/                    # アンケート管理
│   │   └── templates/
│   └── surveys/[id]/                   # アンケート回答ページ
├── components/
│   ├── admin/                          # スタッフ用コンポーネント（サイドバー等）
│   ├── ui/                             # 共通UIコンポーネント（Shadcn UI）
│   ├── app-header.tsx                  # ユーザー用ヘッダー
│   ├── bottom-nav.tsx                  # ボトムナビゲーション
│   ├── checkin-mogiri.tsx              # チケット消込コンポーネント
│   └── ticket-card.tsx                 # チケットカード（有効期限・期限切れバッジ対応）
├── context/
│   └── Web3Provider.tsx                # WalletConnect/AppKit設定
├── lib/
│   ├── discord.ts                      # Discord API（OAuth2, ギルド/ロール管理）
│   ├── email.ts                        # メール送信処理（Resend）
│   ├── nft-helpers.ts                  # NFT共通ヘルパー（IPFS変換, 属性マージ, ログ構築, クエスト動的メタデータ）
│   ├── sbt.ts                          # SBT有効期限ヘルパー（computeExpiryInfo, computeMintExpiresAt）
│   ├── session.ts                      # セッション管理（httpOnly Cookie）
│   ├── shopify.ts                      # Shopify Webhook HMAC署名検証
│   ├── staff-auth.ts                   # スタッフ認証ヘルパー（requireStaffAuth）
│   ├── supabase/
│   │   ├── client.ts                   # Supabase クライアント（ブラウザ用）
│   │   └── server.ts                   # Supabase Admin クライアント（サーバー用）
│   ├── thirdweb.ts                     # Thirdweb Engine API（mintTo, updateTokenMetadata, transfer, NFT取得）
│   └── utils.ts                        # ユーティリティ（cn, calculateDistance）
├── netlify/
│   └── functions/
│       └── process-shopify-order-background.ts  # Shopify注文のバックグラウンド処理
│                                                 # （SBT再購入時の期限延長・オンチェーン更新対応）
├── middleware.ts                        # スタッフ認証ミドルウェア（/staff/* 保護）
├── supabase_schema.sql                  # メインDBスキーマ
├── supabase_templates_schema.sql        # NFTテンプレートスキーマ
├── supabase_airdrop_schema.sql          # エアドロップスキーマ
├── supabase_discord_schema.sql          # Discord連携スキーマ
├── supabase_distribution_spots_schema.sql  # 配布スポットスキーマ
├── supabase_storage_init.sql            # Supabaseストレージ初期化
├── supabase_update_mint_logs.sql        # ミントログ拡張（token_id記録対応）
├── supabase_add_active_roles.sql        # Discord active_roles カラム追加
├── supabase_add_sbt_validity.sql        # SBT有効期限カラム追加
├── setup_quests.sql                     # クエスト（スタンプラリー）スキーマ
└── setup_surveys.sql                    # アンケートスキーマ
```

---

## データベーススキーマ

| テーブル | 説明 |
|---|---|
| `users` | ユーザー情報（email, walletaddress） |
| `nft_templates` | NFTテンプレート定義（名前, 画像, タイプ, 最大供給量, **validity_days**, **shopify_product_url**） |
| `mint_logs` | ミント記録（recipient_wallet, contract_address, token_id, template_id, 取得日） |
| `airdrop_claims` | エアドロップ請求記録（重複防止用） |
| `ticket_usages` | チケット使用記録（使用日時） |
| `transfer_links` | NFT譲渡リンク（トークン, 有効期限, ステータス） |
| `nft_distribution_spots` | 配布スポット（位置情報, 半径, 上限数） |
| `mappings` | Shopify商品 ↔ NFTテンプレートのマッピング |
| `discord_users` | Discord連携ユーザー情報（**active_roles**） |
| `discord_role_mappings` | NFTテンプレート ↔ Discordロールのマッピング |
| `discord_sync_logs` | Discordロール同期ログ |
| `quests` | クエスト定義（スタンプラリー） |
| `quest_locations` | クエストのチェックポイント（位置情報, order_index） |
| `user_quest_progress` | ユーザーのクエスト進行状況 |
| `surveys` | アンケート定義（タイトル, 質問リスト） |
| `survey_responses` | アンケート回答データ |
| `app_settings` | アプリケーション設定（KEY-VALUE形式） |

---

## 環境変数 (.env.local)

```env
# ── Thirdweb（ウォレット管理 & NFTミント）──
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=...
THIRDWEB_SECRET_KEY=...
THIRDWEB_ENGINE_URL=...
THIRDWEB_ENGINE_ACCESS_TOKEN=...
THIRDWEB_ENGINE_BACKEND_WALLET=...

# ── 対象NFTコレクション ──
NEXT_PUBLIC_COLLECTION_ID=ポリゴン上のコントラクトアドレス
NEXT_PUBLIC_CHAIN_NAME=polygon  # or polygon-amoy（テストネット）

# ── スタッフ認証 ──
STAFF_SECRET=任意のパスワード文字列

# ── Resend（メール送信）──
RESEND_API_KEY=re_...

# ── WalletConnect (AppKit) ──
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...

# ── Supabase（データベース）──
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SECRET_KEY=eyJ...

# ── Shopify（Webhook連携）──
SHOPIFY_WEBHOOK_SECRET=shpss_...

# ── Discord（OAuth2 & Bot）──
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=123456789012345678
NEXT_PUBLIC_DISCORD_REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback

# ── LINE（OAuth2）──
LINE_CHANNEL_ID=...
LINE_CHANNEL_SECRET=...
NEXT_PUBLIC_LINE_REDIRECT_URI=https://yourdomain.com/api/auth/line/connect/callback

# ── アプリケーション ──
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## セットアップ手順

### 1. インストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example` を参考に `.env.local` を作成し、上記の環境変数を設定してください。

### 3. Supabase データベースのセットアップ

Supabase SQL Editor で以下のスキーマを **順番に** 実行してください：

```bash
# 1. メインスキーマ（ユーザー、ミントログ、マッピング等）
supabase_schema.sql

# 2. NFTテンプレート & チケット使用
supabase_templates_schema.sql

# 3. エアドロップ
supabase_airdrop_schema.sql

# 4. Discord連携
supabase_discord_schema.sql

# 5. 配布スポット
supabase_distribution_spots_schema.sql

# 6. ストレージ初期化
supabase_storage_init.sql

# 7. ミントログ拡張（token_id記録対応）
supabase_update_mint_logs.sql

# 8. Discord active_roles カラム追加
supabase_add_active_roles.sql

# 9. SBT有効期限カラム追加
supabase_add_sbt_validity.sql

# 10. クエスト（スタンプラリー）
setup_quests.sql

# 11. アンケート
setup_surveys.sql
```

### 4. Discord Bot のセットアップ

1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作成
2. **OAuth2 → Redirects** に `NEXT_PUBLIC_DISCORD_REDIRECT_URI` を追加
3. **Bot** セクションでBotを作成し、Token を取得
4. Botをサーバーに招待（権限: `Manage Roles`, `guilds.join` スコープ）
5. **重要**: Botのロールをサーバー設定で付与したいロールよりも**上位**に配置する

### 5. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` でアクセスできます。

---

## SBT有効期限フロー

```
テンプレート作成時
  → validity_days（例: 365日）と shopify_product_url を設定

NFT配布時（Shopify購入 / 手動配布）
  → mint_logs.created_at に配布日を記録
  → オンチェーンメタデータに Expires_At 属性を書き込み

表示時（マイページ / NFT詳細）
  → created_at + validity_days = expiresAt を計算
  → 期限切れ: カード → グレーアウト + 「期限切れ」バッジ
              詳細 → 「更新する」ボタン表示（Shopifyページへ遷移）

再購入時（Shopify再購入 → Webhook）
  → 同じSBTを保有中の場合は新規ミントせず期限リセット
  → mint_logs.created_at を現在日時に更新
  → オンチェーンの Expires_At も新しい期限に更新

Discord同期時
  → 期限切れSBTは「無効NFT」として扱い、ロール剥奪の対象に含める
```

---

## API リファレンス

### ユーザー向け

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/auth/send-otp` | POST | OTPをメールに送信 |
| `/api/auth/verify-otp` | POST | OTPを検証しセッション確立 |
| `/api/auth/discord` | GET | Discord OAuth2認証開始 |
| `/api/auth/discord/callback` | GET | Discord OAuth2コールバック |
| `/api/auth/line` | GET | LINE OAuth2認証開始 |
| `/api/auth/line/connect/callback` | GET | LINE OAuth2コールバック |
| `/api/login` | POST | ウォレット接続ログイン |
| `/api/logout` | POST | ログアウト |
| `/api/session` | GET | セッション確認 |
| `/api/nfts` | GET | NFT一覧取得（有効期限情報付き） |
| `/api/nfts/[nftId]` | GET | NFT詳細取得（有効期限情報付き） |
| `/api/drop/claim` | POST | 配布スポット / テンプレートからのNFT受取 |
| `/api/transfer/create-link` | POST | 譲渡リンク生成 |
| `/api/transfer/claim` | POST | 譲渡リンクからのNFT受取 |
| `/api/discord/status` | GET | Discord連携状態確認 |
| `/api/discord/sync` | POST | Discordロール同期（期限切れSBT対応） |
| `/api/line/status` | GET | LINE連携状態確認 |
| `/api/quests/scan` | POST | クエストQRスキャン（チェックポイント記録） |
| `/api/surveys/[id]` | GET | アンケート取得 |
| `/api/surveys/[id]/submit` | POST | アンケート回答送信 |
| `/api/notifications` | GET | 通知一覧 |
| `/api/notifications/[id]` | PATCH | 通知既読更新 |

### スタッフ向け

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/staff/login` | POST | スタッフログイン |
| `/api/staff/logout` | POST | スタッフログアウト |
| `/api/staff/issued` | GET | 配布済みNFT一覧 |
| `/api/admin/distribute` | POST | NFT一括配布 |
| `/api/admin/distribute/check-users` | POST | 配布対象ユーザー確認 |
| `/api/admin/spots` | POST | 配布スポット作成 |
| `/api/admin/spots/[id]` | PUT/DELETE | 配布スポット更新・削除 |
| `/api/spots/[id]` | GET | 配布スポット情報取得 |
| `/api/templates` | GET | NFTテンプレート一覧 |
| `/api/templates/[id]` | PUT/DELETE | テンプレート更新・削除 |
| `/api/nfts/create` | POST | テンプレート作成・更新（validity_days等対応） |
| `/api/discord/roles` | GET/POST/DELETE | ロールマッピング管理 |
| `/api/dashboard/stats` | GET | ダッシュボード統計 |
| `/api/logs` | GET | ミントログ取得 |
| `/api/mappings` | GET/POST/PUT/DELETE | Shopify商品マッピング管理 |
| `/api/products` | GET | Shopify商品一覧 |
| `/api/quests` | GET/POST | クエスト一覧・作成 |
| `/api/quests/[id]` | GET/PUT/DELETE | クエスト詳細・更新・削除 |
| `/api/quests/[id]/locations` | GET/POST | チェックポイント管理 |
| `/api/surveys` | GET/POST | アンケート一覧・作成 |
| `/api/settings` | GET/PUT | アプリ設定管理 |
| `/api/upload` | POST | 画像アップロード（Supabase Storage） |
| `/api/users/activities` | GET | ユーザーアクティビティ |

### Webhook

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/webhooks/shopify` | POST | Shopify注文Webhook受信 |
| `/api/webhooks/engine` | POST | Thirdweb Engine Webhook（ミント完了後のtoken_id後書き込み） |

---

## ライブラリ構成

| ファイル | 役割 |
|---|---|
| `lib/nft-helpers.ts` | IPFS URL変換、属性マージ、mint_logエントリ構築、クエスト動的メタデータ計算 |
| `lib/sbt.ts` | SBT有効期限の計算・判定（`computeExpiryInfo`, `computeMintExpiresAt`） |
| `lib/thirdweb.ts` | Thirdweb Engine API（`mintTo`, `updateTokenMetadata`, `transfer`, `burnFrom`, NFT取得） |
| `lib/discord.ts` | Discord API（OAuth2, ロール付与・剥奪, ギルド管理） |
| `lib/staff-auth.ts` | スタッフ認証ヘルパー（`requireStaffAuth`, `isStaffAuthenticated`） |
| `lib/email.ts` | NFT配布通知メール送信（Resend） |
| `lib/session.ts` | セッション管理（httpOnly Cookie） |
| `lib/shopify.ts` | Shopify Webhook HMAC署名検証 |

---

## デプロイ

### Netlify

- **Build Command**: `npm run build`
- **Publish Directory**: `.next`
- `netlify.toml` で `npm` の使用を強制
- 環境変数は Netlify Dashboard → Site settings → Environment variables で設定

### 本番環境チェックリスト

- [ ] 全環境変数が設定されていること
- [ ] Supabase のスキーマが適用されていること（11ファイルすべて）
- [ ] Discord Bot がサーバーに参加済みで、ロール階層が正しいこと
- [ ] Resend のドメイン認証が完了していること
- [ ] `NEXT_PUBLIC_DISCORD_REDIRECT_URI` が本番URLになっていること
- [ ] `NEXT_PUBLIC_LINE_REDIRECT_URI` が本番URLになっていること
- [ ] `NEXT_PUBLIC_APP_URL` が本番URLになっていること
- [ ] Shopify Webhook シークレットが設定されていること

---

## 主要フロー

### ユーザー認証

```
[ユーザー] → メールアドレス入力
  → /api/auth/send-otp（OTP生成 & Resendでメール送信）
  → OTPコード入力
  → /api/auth/verify-otp（OTP検証 → ウォレットアドレス検索）
    → セッション確立 → /mypage
```

### Shopify Webhook（NFT自動発行）

```
[Shopify] → 商品購入
  → /api/webhooks/shopify（HMAC検証 → 受信確認）
  → Netlify Background Function で非同期処理
    → SBT再購入チェック: 既存SBTがあれば期限リセット + オンチェーン Expires_At 更新
    → 新規の場合: ウォレット確認 → NFTミント（Expires_At含む）→ mint_logsに記録
    → 完了メール送信
  → Thirdweb Engine Webhook → /api/webhooks/engine（token_idの後書き込み）
```

### クエスト（スタンプラリー）フロー

```
[スタッフ] → クエスト + チェックポイント作成
  → 各地点にQRコードを設置

[ユーザー] → /quests/scan でQRスキャン
  → /api/quests/scan（チェックポイント記録 → クエスト進行状況更新）
  → NFTメタデータ動的更新（通過地点数に応じて画像・名前が変化）
  → クリア時 → 完了メタデータに更新
```

### スタッフ認証

```
[スタッフ] → /staff/login でパスワード入力
  → /api/staff/login（STAFF_SECRET検証 → httpOnly Cookie設定）
  → middleware.ts が /staff/* を保護
  → /staff/dashboard へリダイレクト
```

---

## セキュリティに関する考慮事項

- **メール認証**: OTP（ワンタイムパスワード）による本人確認
- **セッション管理**: httpOnly Cookie を使用、クライアント側に秘密情報を保存しない
- **スタッフ認証**: Middleware による `/staff/*` ルートの保護（`lib/staff-auth.ts`で集約管理）
- **Webhook検証**: Shopify Webhook はHMACで署名検証（`lib/shopify.ts`）
- **Discord CSRF対策**: OAuth2 state パラメータにランダム nonce を含めて検証
- **配布スポット**: 位置情報による現地確認 + テンプレート単位のユーザー上限チェック

---

Created by Kobuke Tomohiro
