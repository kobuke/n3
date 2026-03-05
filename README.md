# Nanjo NFT Wallet

南城市NFT（沖縄リゾート デジタルチケット）専用のデジタルウォレット & 管理アプリケーション。  
NFTチケットの保有確認・使用（QRコードスキャン）に加え、Shopify連携によるNFT自動発行、Discord連携によるロール付与、配布スポット（位置情報ベース）での現地NFT配布などの管理機能を統合したWebアプリです。

---

## プロジェクト概要

- **目的**: 南城市NFT保有者が自身のチケットを簡単に確認・提示・使用でき、運営側がNFT発行からDiscordコミュニティ管理まで一元管理できる環境を提供する。
- **ターゲット**:
  - **利用者**: メールアドレスまたはMetaMask等のウォレットでNFTを受け取った観光客・市民
  - **スタッフ**: 店舗スタッフ（QRスキャンによるチケット消込）、管理者（NFT発行・Discord連携管理）

---

## 主な機能

### 🏦 NFT発行基盤（Thirdweb Engine）
- **Shopify連携**: 商品購入時にWebhookを受信し、Thirdweb Engine経由で自動的にNFTをミント
- **スタッフ一括配布**: 管理画面からメールアドレスリストに対して一括エアドロップ
- **配布スポット**: QRコード＋位置情報による現地限定NFT配布（スポット上限・テンプレート上限に対応）
- **LINE連携配布**: LINEブラウザからのアクセス時に自動でNFTを配布
- **Dynamic NFT**: チケット使用時にオンチェーンのメタデータを更新し、外部プラットフォームでも「使用済み」として反映

### 🎫 ユーザー向け

1. **ログイン / 認証**
   - **メール認証 (OTP)**: メールアドレスに6桁の認証コードを送信
   - **WalletConnect (AppKit)**: MetaMask等の外部ウォレットでの認証
2. **マイページ**
   - NFTチケットの一覧表示（取得日・使用ステータス付き）
   - チケット詳細ページ: チケット画像、説明、使用用QRコード、取得日時の表示
   - NFTの譲渡リンク生成
3. **配布スポットでのNFT受け取り**
   - QRコードスキャン → 位置情報確認 → NFT受取の一連のフロー
   - 位置情報が取得できない場合のガイドページ
4. **Discord連携**
   - OAuth2認証によるDiscordサーバーへの自動参加 + NFTに応じたロール付与

### 🔧 スタッフ向け（`/staff/*`）

5. **スタッフ認証** — `STAFF_SECRET` によるパスワード認証
6. **QRスキャン** (`/staff/scan`) — カメラでQRコードを読み取りチケット消込
7. **ダッシュボード** (`/staff/dashboard`) — ミント統計、システム概要
8. **NFTテンプレート管理** (`/staff/templates`) — テンプレートの作成・編集
9. **配布スポット管理** (`/staff/spots`) — 位置情報ベースの配布スポット作成・QRコード生成
10. **一括配布** (`/staff/distribute`) — メールアドレス指定でのNFT一括配布
11. **商品マッピング** (`/staff/mapping`) — Shopify商品 ↔ NFTテンプレートの紐付け
12. **注文履歴** (`/staff/orders`) — Shopify注文に基づくミント履歴
13. **Discord連携管理** (`/staff/discord`) — NFTテンプレート ↔ Discordロールのマッピング
14. **設定** (`/staff/settings`) — 通知設定、LINE配布設定

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
│   │   │   └── status/         # Discord連携状態確認
│   │   ├── drop/claim/         # 配布スポット・テンプレートからのNFT受取
│   │   ├── login/              # ウォレット接続ログイン
│   │   ├── logout/             # ログアウト
│   │   ├── nfts/               # NFT一覧取得
│   │   │   └── [nftId]/        # NFT個別詳細取得
│   │   ├── session/            # セッション確認
│   │   ├── spots/[id]/         # 配布スポット公開API (GET)
│   │   ├── templates/          # NFTテンプレート一覧・CRUD
│   │   ├── transfer/
│   │   │   ├── create/         # 譲渡リンク生成
│   │   │   └── claim/          # 譲渡リンクからのNFT受取
│   │   ├── use-ticket/         # チケット消込 (メタデータ更新)
│   │   └── webhooks/shopify/   # Shopify Webhook受信
│   ├── claim/                  # 譲渡リンクのクレームページ
│   ├── drop/                   # 旧テンプレートベースの配布ページ
│   ├── guide/                  # 位置情報設定ガイドページ
│   ├── mypage/                 # ユーザーマイページ (NFT一覧)
│   │   └── [nftId]/            # NFT詳細 (QRコード・取得日表示)
│   ├── spot/[id]/              # 配布スポットの受取ページ
│   ├── staff/                  # スタッフ管理画面
│   │   ├── dashboard/          # ダッシュボード
│   │   ├── scan/               # QRスキャナー
│   │   ├── templates/          # NFTテンプレート管理
│   │   ├── spots/              # 配布スポット管理
│   │   ├── distribute/         # 一括配布
│   │   ├── mapping/            # 商品マッピング
│   │   ├── orders/             # 注文履歴
│   │   ├── discord/            # Discordロール管理
│   │   └── settings/           # 設定
│   ├── layout.tsx              # ルートレイアウト
│   └── page.tsx                # ログインページ
├── components/
│   ├── admin/                  # スタッフ用コンポーネント (サイドバー等)
│   ├── ui/                     # 共通UIコンポーネント (Shadcn UI)
│   ├── app-header.tsx          # ユーザー用ヘッダー
│   ├── ticket-card.tsx         # チケットカード (取得日表示対応)
│   └── qr-scanner.tsx          # QRスキャナー
├── context/
│   └── Web3Provider.tsx        # WalletConnect/AppKit設定
├── lib/
│   ├── discord.ts              # Discord API (OAuth2, ギルド/ロール管理)
│   ├── nft-helpers.ts          # NFT共通ヘルパー (IPFS変換, 属性マージ, ログ構築)
│   ├── session.ts              # セッション管理 (Cookie)
│   ├── shopify.ts              # Shopify Webhook HMAC検証
│   ├── supabase/
│   │   ├── client.ts           # Supabase クライアント (ブラウザ用)
│   │   └── server.ts           # Supabase Admin クライアント (サーバー用)
│   ├── thirdweb.ts             # Thirdweb Engine API (ミント, 転送, NFT取得)
│   └── utils.ts                # ユーティリティ (cn, calculateDistance)
├── netlify/
│   └── functions/
│       └── process-shopify-order-background.ts  # Shopify注文のバックグラウンド処理
├── middleware.ts               # スタッフ認証ミドルウェア
├── supabase_schema.sql         # メインDBスキーマ
├── supabase_templates_schema.sql      # NFTテンプレートスキーマ
├── supabase_airdrop_schema.sql        # エアドロップスキーマ
├── supabase_discord_schema.sql        # Discord連携スキーマ
├── supabase_distribution_spots_schema.sql  # 配布スポットスキーマ
├── supabase_storage_init.sql          # ストレージ初期化
├── supabase_update_mint_logs.sql      # ミントログ拡張（取得日対応）
└── netlify.toml                # Netlifyデプロイ設定
```

---

## データベーススキーマ

| テーブル | 説明 |
|---|---|
| `users` | ユーザー情報（email, walletaddress） |
| `nft_templates` | NFTテンプレート定義（名前, 画像, タイプ, 最大供給量） |
| `mint_logs` | ミント記録（recipient_wallet, contract_address, token_id, template_id, 取得日） |
| `airdrop_claims` | エアドロップ請求記録（重複防止用） |
| `ticket_usages` | チケット使用記録（使用日時） |
| `transfer_links` | NFT譲渡リンク（トークン, 有効期限, ステータス） |
| `nft_distribution_spots` | 配布スポット（位置情報, 半径, 上限数） |
| `mappings` | Shopify商品 ↔ NFTテンプレートのマッピング |
| `discord_users` | Discord連携ユーザー情報 |
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

# 7. ミントログ拡張（取得日対応）
supabase_update_mint_logs.sql
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

## デプロイ

### Netlify

- **Build Command**: `npm run build`
- **Publish Directory**: `.next`
- `netlify.toml` で `npm` の使用を強制
- 環境変数は Netlify Dashboard → Site settings → Environment variables で設定

### 本番環境チェックリスト

- [ ] 全環境変数が設定されていること
- [ ] Supabase のスキーマが適用されていること (7ファイルすべて)
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
  → ウォレットアドレス確認 (なければ Thirdweb Engine で自動生成)
  → NFTをミント → mint_logsに記録
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
| `/api/nfts` | GET | NFT一覧取得（取得日付き） |
| `/api/nfts/[nftId]` | GET | NFT詳細取得（取得日付き） |
| `/api/drop/claim` | POST | 配布スポット / テンプレートからのNFT受取 |
| `/api/transfer/create` | POST | 譲渡リンク生成 |
| `/api/transfer/claim` | POST | 譲渡リンクからのNFT受取 |
| `/api/discord/status` | GET | Discord連携状態確認 |

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
| `/api/templates/[id]` | PUT/DELETE | テンプレート更新・削除 |
| `/api/use-ticket` | POST | チケット消込 |
| `/api/discord/roles` | GET/POST/DELETE | ロールマッピング管理 |
| `/api/dashboard/stats` | GET | ダッシュボード統計 |
| `/api/logs` | GET | ミントログ取得 |
| `/api/mappings` | GET/POST/PUT/DELETE | 商品マッピング管理 |

### Webhook

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/webhooks/shopify` | POST | Shopify注文Webhook受信 |

---

## 既知の制限事項・TODO

- **取得日の精度**: Thirdweb Engine は非同期でミントするため、`mint_logs` の `token_id` が null になるケースがある。同じテンプレートのNFTを複数保有している場合、取得日が重複して表示される可能性がある。根本解決には Thirdweb Engine の Webhook を利用した `token_id` の後書き込みが必要。（コード内 `TODO: 【要改善】` を参照）

---

## セキュリティに関する考慮事項

- **メール認証**: OTP（ワンタイムパスワード）による本人確認
- **セッション管理**: httpOnly Cookie を使用、クライアント側に秘密情報を保存しない
- **スタッフ認証**: Middleware による `/staff/*` ルートの保護
- **Webhook検証**: Shopify Webhook はHMACで署名検証
- **Discord CSRF対策**: OAuth2 state パラメータにランダム nonce を含めて検証
- **配布スポット**: 位置情報による現地確認 + テンプレート単位のユーザー上限チェック

---

Created by Kobuke Tomohiro
