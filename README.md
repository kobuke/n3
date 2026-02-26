# Nanjo NFT Wallet

南城市NFT（沖縄リゾート デジタルチケット）専用のデジタルウォレット & 管理アプリケーション。  
NFTチケットの保有確認・使用（QRコードスキャン）に加え、Shopify連携によるNFT自動発行、Discord連携によるロール付与などの管理機能を統合したWebアプリです。

---

## プロジェクト概要

- **目的**: 南城市NFT保有者が自身のチケットを簡単に確認・提示・使用でき、運営側がNFT発行からDiscordコミュニティ管理まで一元管理できる環境を提供する。
- **ターゲット**:
  - **利用者**: メールアドレスまたはMetaMask等のウォレットでNFTを受け取った観光客・市民
  - **スタッフ**: 店舗スタッフ（QRスキャンによるチケット消込）、管理者（NFT発行・Discord連携管理）

---

## 主な機能

### 🎫 ユーザー向け

1. **ログイン / 認証**
   - **メール認証 (OTP)**: Thirdweb In-App Walletを持つユーザー向け。メールアドレスに6桁の認証コードを送信（LINE連携時も同様）。
   - **WalletConnect (AppKit)**: MetaMask等の外部ウォレットを持つユーザー向け。
   - メールに紐づくウォレットが存在しない場合でも、ログイン自体は可能ですがウォレット接続を求められます。

2. **マイページ (チケット一覧)**
   - 保有するNFTチケットの一覧表示（南城市NFTコレクションのみ）
   - チケット詳細ページ: チケット画像、説明、使用用QRコードの表示
   - ステータス表示: 「未使用」「使用済み」

3. **Discord連携**
   - マイページから「Discordを連携する」ボタンでOAuth2認証
   - Discordサーバーへの自動参加 + NFTに応じたロール付与
   - 連携状態の表示（連携済みユーザー名）

### 🔧 スタッフ向け（`/staff/*`）

4. **スタッフ認証**
   - `STAFF_SECRET` によるパスワード認証（httpOnly Cookie）
   - Middleware による全 `/staff/*` ルートの保護（未認証時は `/staff/login` にリダイレクト）

5. **QRスキャン** (`/staff/scan`)
   - カメラでユーザーのQRコードを読み取り
   - NFT情報表示 + チケット消込（メタデータ更新）

6. **ダッシュボード** (`/staff/dashboard`)
   - ミント統計、システム概要

7. **商品マッピング** (`/staff/mapping`)
   - Shopify商品 ↔ NFTコレクション/テンプレートのマッピング管理

8. **注文履歴** (`/staff/orders`)
   - Shopify注文に基づくNFTミントの履歴・ログ表示

9. **監査ログ** (`/staff/audit`)
   - システム全体の操作ログ

10. **Discord連携管理** (`/staff/discord`)
    - NFTコレクション ↔ Discordロールのマッピング管理
    - Discordサーバーのロール一覧取得

11. **設定** (`/staff/settings`)
    - アプリケーション設定

---

## システム構成

### 技術スタック

| カテゴリ | 技術 |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v3, Shadcn UI, Lucide React |
| **認証** | Cookie-based Session, Email OTP (Resend + Thirdweb Auth), WalletConnect (AppKit/Reown) |
| **Blockchain** | Thirdweb Engine (NFT発行、In-App Wallet自動生成), Alchemy SDK (必要に応じたデータ取得) |
| **Database** | Supabase (PostgreSQL) |
| **Email** | Resend |
| **外部連携** | Discord API (OAuth2, Bot), Shopify Webhooks |
| **Hosting** | Netlify |

### ディレクトリ構造

```
.
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── send-otp/       # OTP送信
│   │   │   ├── verify-otp/     # OTP検証
│   │   │   └── discord/        # Discord OAuth2 (認証開始 + コールバック)
│   │   ├── discord/
│   │   │   ├── roles/          # Discordロールマッピング CRUD (スタッフ用)
│   │   │   └── status/         # Discord連携状態確認 (ユーザー用)
│   │   ├── dashboard/stats/    # ダッシュボード統計
│   │   ├── login/              # ウォレット接続ログイン
│   │   ├── logout/             # ログアウト
│   │   ├── logs/               # ミントログ取得
│   │   ├── mappings/           # 商品マッピング CRUD
│   │   ├── nfts/               # NFT一覧取得, 個別NFT取得
│   │   ├── products/           # Shopify商品一覧
│   │   ├── session/            # セッション確認
│   │   ├── staff/
│   │   │   ├── login/          # スタッフログイン (Cookie設定)
│   │   │   └── logout/         # スタッフログアウト
│   │   ├── templates/          # Crossmintテンプレート一覧
│   │   ├── use-ticket/         # チケット消込 (メタデータ更新)
│   │   └── webhooks/shopify/   # Shopify Webhook受信
│   ├── mypage/                 # ユーザーマイページ (チケット一覧)
│   │   └── [nftId]/            # チケット詳細 (QRコード表示)
│   ├── staff/
│   │   ├── login/              # スタッフログイン画面
│   │   ├── dashboard/          # ダッシュボード
│   │   ├── scan/               # QRスキャナー
│   │   ├── mapping/            # 商品マッピング管理
│   │   ├── orders/             # 注文履歴
│   │   ├── audit/              # 監査ログ
│   │   ├── discord/            # Discordロール管理
│   │   ├── settings/           # 設定
│   │   └── layout.tsx          # スタッフ共通レイアウト (サイドバー)
│   ├── layout.tsx              # ルートレイアウト (AppKitProvider, Toaster)
│   └── page.tsx                # ログインページ
├── components/
│   ├── admin/                  # スタッフ用コンポーネント (サイドバー等)
│   │   ├── ui/                 # スタッフ用UIコンポーネント
│   │   └── app-sidebar.tsx     # サイドバーナビゲーション
│   ├── ui/                     # 共通UIコンポーネント (Shadcn UI)
│   ├── app-header.tsx          # ユーザー用ヘッダー
│   ├── ticket-card.tsx         # チケットカード
│   └── qr-scanner.tsx          # QRスキャナー
├── context/
│   └── Web3Provider.tsx        # WalletConnect/AppKit設定
├── lib/
│   ├── alchemy.ts              # Alchemy SDK (NFTデータ取得)
│   ├── crossmint.ts            # Crossmint API (ウォレット管理, NFTミント)
│   ├── discord.ts              # Discord API (OAuth2, ギルド/ロール管理)
│   ├── session.ts              # セッション管理 (Cookie)
│   ├── shopify.ts              # Shopify Webhook検証
│   ├── supabase/
│   │   ├── client.ts           # Supabase クライアント (ブラウザ用)
│   │   └── server.ts           # Supabase Admin クライアント (サーバー用)
│   └── utils.ts                # ユーティリティ
├── middleware.ts                # スタッフ認証ミドルウェア
├── supabase_discord_schema.sql # Discord関連テーブルのスキーマ
├── netlify.toml                # Netlifyデプロイ設定
└── public/                     # 静的アセット
```

---

## 環境変数 (.env.local)

このアプリを動作させるには、以下の環境変数が必要です。

```env
# ── Thirdweb (ウォレット管理 & NFTミント) ──
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=...
THIRDWEB_SECRET_KEY=...
THIRDWEB_ENGINE_URL=...
THIRDWEB_ENGINE_ACCESS_TOKEN=...
THIRDWEB_ENGINE_BACKEND_WALLET=...

# ── 対象NFTコレクション ──
NEXT_PUBLIC_COLLECTION_ID=ポリゴン上のコントラクトアドレス

# ── スタッフ認証 ──
STAFF_SECRET=任意のパスワード文字列

# ── Alchemy (ブロックチェーンデータ) ──
ALCHEMY_API_KEY=...

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

Supabase SQL Editor で以下のスキーマを実行してください：

```bash
# メインスキーマ (商品マッピング、ミントログ等)
nft-manage-webapp/supabase_schema.sql

# Discord連携テーブル
supabase_discord_schema.sql
```

### 4. Discord Bot のセットアップ

1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作成
2. **OAuth2 → Redirects** に `NEXT_PUBLIC_DISCORD_REDIRECT_URI` を追加
3. **Bot** セクションでBotを作成し、Token を取得
4. Botをサーバーに招待（権限: `Manage Roles`, `guilds.join` スコープ）
5. **重要**: Botのロールをサーバー設定で付与したいロールよりも**上位**に配置する

### 5. Resend ドメイン認証

1. [Resend Dashboard](https://resend.com/domains) でドメインを追加・認証
2. DNS レコード (MX, SPF, DKIM) を設定
3. 認証完了後、任意のメールアドレスへOTPを送信可能

### 6. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` でアクセスできます。

---

## デプロイ

### Netlify

- **Build Command**: `npm run build`
- **Publish Directory**: `.next`
- `netlify.toml` で `npm` の使用を強制しています
- 環境変数は Netlify Dashboard → Site settings → Environment variables で設定

### 本番環境チェックリスト

- [ ] 全環境変数が設定されていること
- [ ] Supabase のスキーマが適用されていること
- [ ] Discord Bot がサーバーに参加済みで、ロール階層が正しいこと
- [ ] Resend のドメイン認証が完了していること
- [ ] `NEXT_PUBLIC_DISCORD_REDIRECT_URI` が本番URLになっていること

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

### 自動ウォレット生成 (Shopify Webhook)

```
[Shopify] → 商品購入
  → /api/webhooks/shopify (Webhook受信)
  → ユーザーのウォレットアドレス確認
  → なければ Thirdweb Engine API にて Backend Managed Wallet を自動生成
  → Usersテーブルに保存 → NFTを新ウォレットにMint
  → お客様に完了メール送信
```

### スタッフ認証

```
[スタッフ] → /staff/login でパスワード入力
  → /api/staff/login (STAFF_SECRET検証 → httpOnly Cookie設定)
  → middleware.ts が /staff/* を保護
  → /staff/dashboard へリダイレクト
```

### Discord連携

```
[ユーザー] → /mypage「Discordを連携する」ボタン
  → /api/auth/discord (OAuth2 URL生成 → Discord認証画面)
  → Discord認証を許可
  → /api/auth/discord/callback
    → トークン交換
    → Discordプロフィール取得
    → Supabase(discord_users)に保存
    → ギルド参加 + ロール付与 (discord_role_mappingsに基づく)
  → /mypage?discord=success (トースト通知)
```

---

## セキュリティに関する考慮事項

- **手動入力の廃止**: なりすまし防止のため、ウォレットアドレスの手動入力機能は廃止
- **メール認証**: OTP（ワンタイムパスワード）による本人確認
- **セッション管理**: httpOnly Cookie を使用、クライアント側に秘密情報を保存しない
- **スタッフ認証**: Middleware による `/staff/*` ルートの保護、Cookie ベースの認証
- **Webhook検証**: Shopify Webhook はHMACで署名検証
- **Discord CSRF対策**: OAuth2 state パラメータにランダム nonce を含めて検証

---

## API リファレンス

| エンドポイント | メソッド | 認証 | 説明 |
|---|---|---|---|
| `/api/auth/send-otp` | POST | なし | OTPをメールに送信 |
| `/api/auth/verify-otp` | POST | なし | OTPを検証しセッション確立 |
| `/api/auth/discord` | GET | ユーザー | Discord OAuth2認証開始 |
| `/api/auth/discord/callback` | GET | なし | Discord OAuth2コールバック |
| `/api/login` | POST | なし | ウォレット接続ログイン |
| `/api/logout` | POST | なし | ログアウト |
| `/api/session` | GET | なし | セッション確認 |
| `/api/nfts` | GET | ユーザー | NFT一覧取得 |
| `/api/nfts/[nftId]` | GET | ユーザー | NFT詳細取得 |
| `/api/use-ticket` | POST | スタッフ | チケット消込 |
| `/api/discord/status` | GET | ユーザー | Discord連携状態確認 |
| `/api/discord/roles` | GET/POST/DELETE | スタッフ | ロールマッピング管理 |
| `/api/dashboard/stats` | GET | スタッフ | ダッシュボード統計 |
| `/api/logs` | GET | スタッフ | ミントログ取得 |
| `/api/mappings` | GET/POST/PUT/DELETE | スタッフ | 商品マッピング管理 |
| `/api/products` | GET | スタッフ | Shopify商品一覧 |
| `/api/templates` | GET | スタッフ | Crossmintテンプレート一覧 |
| `/api/webhooks/shopify` | POST | Webhook | Shopify注文Webhook |
| `/api/staff/login` | POST | なし | スタッフログイン |
| `/api/staff/logout` | POST | なし | スタッフログアウト |

---

Created by Kobuke Tomohiro
