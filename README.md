# Nanjo NFT Wallet

南城市NFT（沖縄リゾート デジタルチケット）専用のデジタルウォレット & 管理アプリケーション。  
NFTチケットの保有確認・使用(もぎり)に加え、Shopify連携によるNFT自動発行、SBT有効期限管理、Discord連携によるロール付与、配布スポット（位置情報ベース）での現地NFT配布などの管理機能を統合したWebアプリです。

---

## プロジェクト概要

- **目的**: NFT保有者が自身のチケットを簡単に確認・提示・使用でき、運営側がNFT発行からDiscordコミュニティ管理まで一元管理できる環境を提供する。
- **ターゲット**:
  - **利用者**: メールアドレスまたは外部ウォレットでNFTを受け取った観光客・市民
  - **スタッフ**: 管理者（NFT発行・テンプレート管理・Discord連携・Shopify連携）

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

### 🎫 ユーザー向け

1. **ログイン / 認証**
   - **メール認証 (OTP)**: メールアドレスに6桁の認証コードを送信
   - **WalletConnect (AppKit)**: MetaMask等の外部ウォレットでの認証
2. **マイページ**
   - NFTチケットの一覧表示（取得日・使用ステータス・有効期限付き）
   - 期限切れSBTのグレーアウト表示と「期限切れ」バッジ
   - チケット詳細ページ: 有効期限表示・「更新する」ボタン・譲渡リンク生成
3. **配布スポットでのNFT受け取り**
   - QRコードスキャン → 位置情報確認 → NFT受取の一連のフロー
4. **Discord連携**
   - OAuth2認証によるDiscordサーバーへの自動参加 + NFTに応じたロール付与

### 🔧 スタッフ向け（`/staff/*`）

5. **スタッフ認証** — `STAFF_SECRET` によるパスワード認証
6. **ダッシュボード** (`/staff/dashboard`) — ミント統計、システム概要
7. **NFTテンプレート管理** (`/staff/templates`) — テンプレートの作成・編集（SBT有効期限・更新URLの設定を含む）
8. **配布スポット管理** (`/staff/spots`) — 位置情報ベースの配布スポット作成・QRコード生成
9. **一括配布** (`/staff/distribute`) — メールアドレス指定でのNFT一括配布
10. **商品マッピング** (`/staff/mapping`) — Shopify商品 ↔ NFTテンプレートの紐付け
11. **注文履歴** (`/staff/orders`) — Shopify注文に基づくミント履歴
12. **Discord連携管理** (`/staff/discord`) — NFTテンプレート ↔ Discordロールのマッピング
13. **設定** (`/staff/settings`) — 通知設定、LINE配布設定

---

## システム構成

### 技術スタック

| カテゴリ | 技術 |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v3, Shadcn UI, Lucide React |
| **認証** | Cookie-based Session, Email OTP (Resend), WalletConnect (AppKit/Reown) |
| **Blockchain** | Thirdweb Engine (ERC-1155 NFT発行・管理), Thirdweb SDK v5 |
| **Database** | Supabase (PostgreSQL) |
| **Email** | Resend |
| **外部連携** | Discord API (OAuth2, Bot), Shopify Webhooks |
| **Hosting** | Netlify |

### ディレクトリ構造

```
.
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── distribute/     # スタッフによるNFT一括配布
│   │   │   └── spots/[id]/     # 配布スポット管理 CRUD
│   │   ├── airdrop/line/       # LINE連携自動配布
│   │   ├── auth/
│   │   │   ├── send-otp/       # OTP送信
│   │   │   ├── verify-otp/     # OTP検証
│   │   │   └── discord/        # Discord OAuth2 (認証開始 + コールバック)
│   │   ├── discord/
│   │   │   ├── roles/          # Discordロールマッピング CRUD
│   │   │   ├── status/         # Discord連携状態確認
│   │   │   └── sync/           # Discordロール同期（有効期限切れSBT対応）
│   │   ├── drop/claim/         # 配布スポット・テンプレートからのNFT受取
│   │   ├── nfts/               # NFT一覧取得（有効期限情報付き）
│   │   │   └── [nftId]/        # NFT個別詳細取得（有効期限情報付き）
│   │   ├── templates/          # NFTテンプレート一覧・CRUD
│   │   ├── transfer/
│   │   │   ├── create/         # 譲渡リンク生成
│   │   │   └── claim/          # 譲渡リンクからのNFT受取
│   │   └── webhooks/shopify/   # Shopify Webhook受信
│   ├── claim/                  # 譲渡リンクのクレームページ
│   ├── mypage/                 # ユーザーマイページ (NFT一覧)
│   │   └── [nftId]/            # NFT詳細 (有効期限・更新ボタン表示)
│   ├── spot/[id]/              # 配布スポットの受取ページ
│   └── staff/                  # スタッフ管理画面
│       ├── dashboard/
│       ├── templates/
│       ├── spots/
│       ├── distribute/
│       ├── mapping/
│       ├── orders/
│       ├── discord/
│       └── settings/
├── components/
│   ├── admin/                  # スタッフ用コンポーネント (サイドバー等)
│   ├── ui/                     # 共通UIコンポーネント (Shadcn UI)
│   ├── app-header.tsx          # ユーザー用ヘッダー
│   └── ticket-card.tsx         # チケットカード (有効期限・期限切れバッジ対応)
├── context/
│   └── Web3Provider.tsx        # WalletConnect/AppKit設定
├── lib/
│   ├── discord.ts              # Discord API (OAuth2, ギルド/ロール管理)
│   ├── email.ts                # メール送信処理共通化 (Resend)
│   ├── nft-helpers.ts          # NFT共通ヘルパー (IPFS変換, 属性マージ, ログ構築)
│   ├── sbt.ts                  # SBT有効期限ヘルパー (期限計算, ミント時Expires_At算出)
│   ├── session.ts              # セッション管理 (Cookie)
│   ├── shopify.ts              # Shopify Webhook HMAC検証
│   ├── staff-auth.ts           # スタッフ認証ヘルパー (requireStaffAuth)
│   ├── supabase/
│   │   ├── client.ts           # Supabase クライアント (ブラウザ用)
│   │   └── server.ts           # Supabase Admin クライアント (サーバー用)
│   ├── thirdweb.ts             # Thirdweb Engine API (ミント, 転送, メタデータ更新, NFT取得)
│   └── utils.ts                # ユーティリティ (cn, calculateDistance)
├── netlify/
│   └── functions/
│       └── process-shopify-order-background.ts  # Shopify注文のバックグラウンド処理
│                                                 # (SBT再購入時の期限延長対応)
├── middleware.ts               # スタッフ認証ミドルウェア
├── supabase_schema.sql                    # メインDBスキーマ
├── supabase_templates_schema.sql          # NFTテンプレートスキーマ
├── supabase_airdrop_schema.sql            # エアドロップスキーマ
├── supabase_discord_schema.sql            # Discord連携スキーマ
├── supabase_distribution_spots_schema.sql # 配布スポットスキーマ
├── supabase_storage_init.sql              # ストレージ初期化
├── supabase_update_mint_logs.sql          # ミントログ拡張（token_id記録対応）
├── supabase_add_active_roles.sql          # Discord active_roles カラム追加
└── supabase_add_sbt_validity.sql          # SBT有効期限カラム追加
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
| `app_settings` | アプリケーション設定（KEY-VALUE形式） |

---

## 環境変数 (.env.local)

```env
# ── Thirdweb (ウォレット管理 & NFTミント) ──
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=...
THIRDWEB_SECRET_KEY=...
THIRDWEB_ENGINE_URL=...
THIRDWEB_ENGINE_ACCESS_TOKEN=...
THIRDWEB_ENGINE_BACKEND_WALLET=...

# ── 対象NFTコレクション ──
NEXT_PUBLIC_COLLECTION_ID=ポリゴン上のコントラクトアドレス
NEXT_PUBLIC_CHAIN_NAME=polygon  # or polygon-amoy (テストネット)

# ── スタッフ認証 ──
STAFF_SECRET=任意のパスワード文字列

# ── Resend (メール送信) ──
RESEND_API_KEY=re_...

# ── WalletConnect (AppKit) ──
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...

# ── Supabase (データベース) ──
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SECRET_KEY=eyJ...

# ── Shopify (Webhook連携) ──
SHOPIFY_WEBHOOK_SECRET=shpss_...

# ── Discord (OAuth2 & Bot) ──
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=123456789012345678
NEXT_PUBLIC_DISCORD_REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback

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
# 1. メインスキーマ (ユーザー、ミントログ、マッピング等)
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

## デプロイ

### Netlify

- **Build Command**: `npm run build`
- **Publish Directory**: `.next`
- `netlify.toml` で `npm` の使用を強制
- 環境変数は Netlify Dashboard → Site settings → Environment variables で設定

### 本番環境チェックリスト

- [ ] 全環境変数が設定されていること
- [ ] Supabase のスキーマが適用されていること（9ファイルすべて）
- [ ] Discord Bot がサーバーに参加済みで、ロール階層が正しいこと
- [ ] Resend のドメイン認証が完了していること
- [ ] `NEXT_PUBLIC_DISCORD_REDIRECT_URI` が本番URLになっていること
- [ ] `NEXT_PUBLIC_APP_URL` が本番URLになっていること

---

## 認証フロー

### ユーザー認証

```
[ユーザー] → メールアドレス入力
  → /api/auth/send-otp (OTP生成 & Resendでメール送信)
  → OTPコード入力
  → /api/auth/verify-otp (OTP検証 → Usersテーブルからウォレットアドレス検索)
    → セッション確立 → /mypage
```

### NFT配布スポット受取フロー

```
[ユーザー] → QRコードスキャン or URL直接アクセス
  → /spot/[id] (スポット情報表示)
  → 位置情報確認
  → /api/drop/claim (位置検証 → 在庫確認 → ミント → mint_logsに記録)
    → マイページでNFT確認
```

### 自動ウォレット生成 (Shopify Webhook)

```
[Shopify] → 商品購入
  → /api/webhooks/shopify (Webhook受信)
  → Netlify Background Function で非同期処理
  → SBT再購入チェック（既存SBTがあれば期限リセット + オンチェーンメタデータ更新）
  → 新規の場合: ウォレットアドレス確認 → NFTをミント（Expires_Atを含む） → mint_logsに記録
  → 完了メール送信
```

### スタッフ認証

```
[スタッフ] → /staff/login でパスワード入力
  → /api/staff/login (STAFF_SECRET検証 → httpOnly Cookie設定)
  → middleware.ts が /staff/* を保護
  → /staff/dashboard へリダイレクト
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
| `/api/login` | POST | ウォレット接続ログイン |
| `/api/logout` | POST | ログアウト |
| `/api/session` | GET | セッション確認 |
| `/api/nfts` | GET | NFT一覧取得（有効期限情報付き） |
| `/api/nfts/[nftId]` | GET | NFT詳細取得（有効期限情報付き） |
| `/api/drop/claim` | POST | 配布スポット / テンプレートからのNFT受取 |
| `/api/transfer/create` | POST | 譲渡リンク生成 |
| `/api/transfer/claim` | POST | 譲渡リンクからのNFT受取 |
| `/api/discord/status` | GET | Discord連携状態確認 |
| `/api/discord/sync` | POST | Discordロール同期（期限切れSBT対応） |

### スタッフ向け

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/staff/login` | POST | スタッフログイン |
| `/api/staff/logout` | POST | スタッフログアウト |
| `/api/admin/distribute` | POST | NFT一括配布 |
| `/api/admin/spots` | POST | 配布スポット作成 |
| `/api/admin/spots/[id]` | PUT/DELETE | 配布スポット更新・削除 |
| `/api/spots/[id]` | GET | 配布スポット情報取得 |
| `/api/templates` | GET/POST | NFTテンプレート一覧・作成 |
| `/api/nfts/create` | POST | テンプレート作成・更新（validity_days, shopify_product_url対応） |
| `/api/discord/roles` | GET/POST/DELETE | ロールマッピング管理 |
| `/api/dashboard/stats` | GET | ダッシュボード統計 |
| `/api/logs` | GET | ミントログ取得 |
| `/api/mappings` | GET/POST/PUT/DELETE | 商品マッピング管理 |

### Webhook

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/webhooks/shopify` | POST | Shopify注文Webhook受信 |

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

## セキュリティに関する考慮事項

- **メール認証**: OTP（ワンタイムパスワード）による本人確認
- **セッション管理**: httpOnly Cookie を使用、クライアント側に秘密情報を保存しない
- **スタッフ認証**: Middleware による `/staff/*` ルートの保護（`lib/staff-auth.ts`で集約管理）
- **Webhook検証**: Shopify Webhook はHMACで署名検証（`lib/shopify.ts`）
- **Discord CSRF対策**: OAuth2 state パラメータにランダム nonce を含めて検証
- **配布スポット**: 位置情報による現地確認 + テンプレート単位のユーザー上限チェック

---

Created by Kobuke Tomohiro
