# Nanjo NFT Wallet

南城市NFT（Okinawa Resort Digital Ticket）専用のデジタルウォレットアプリ。
NFTチケットの保有確認、使用（QRコードスキャン）をシンプルに行えるWebアプリケーションです。

## プロジェクト概要

- **目的**: 南城市NFT保有者が、自身のチケットを簡単に確認・提示・使用できる環境を提供する。
- **ターゲット**:
  - 利用者: メールアドレスまたはMetaMask等のウォレットでNFTを受け取った観光客・市民。
  - 事業者: 店舗スタッフ（利用者はQRコードを提示し、スタッフがスキャンして消込を行う運用を想定）。

## 主な機能

1.  **ログイン / 認証**
    - **メール認証 (OTP)**: Crossmint発行のウォレットを持つユーザー向け。メールアドレスを入力し、届いた6桁のコードでログイン。
    - **WalletConnect (AppKit)**: MetaMask等の外部ウォレットを持つユーザー向け。PC/スマホアプリ両対応。
    - **セッション管理**: httpOnly Cookieを使用したステートレスなセッション管理。

2.  **マイページ (チケット一覧)**
    - 保有するNFTチケットの一覧表示。
    - **フィルタリング**: 南城市NFTコレクション (`NEXT_PUBLIC_COLLECTION_ID`) に該当するNFTのみを表示。
    - チケット詳細モーダル: チケット画像、説明、使用用QRコードの表示。

3.  **チケット使用 (スタッフ用)**
    - **QRコードスキャン**: 店舗スタッフが利用者のQRコードを読み取る機能 (`/staff/scan`)。
    - **消込処理**: スタッフ確認後、NFTをBurn（焼却）または使用済みメタデータを更新するAPIをコール（※現状はモックまたはBurn APIへの接続を想定）。

## システム構成

### 技術スタック
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Shadcn UI, Lucide React
- **Authentication**: Custom Session (Cookie-based), Email OTP (Resend), WalletConnect (AppKit/Reown)
- **Blockchain Interaction**:
  - **Alchemy SDK**: NFTデータの取得（所有権、メタデータ）。
  - **Crossmint**: メールアドレスに紐づくカストディアルウォレットの参照。
  - **Wagmi / Viem**: クライアントサイドでのウォレット接続。

### ディレクトリ構造
```
.
├── app/
│   ├── api/            # Backend API Routes (Login, Logout, NFT fetching, OTP)
│   ├── mypage/         # User Dashboard (Ticket List)
│   ├── staff/          # Staff Tools (QR Scanner)
│   ├── layout.tsx      # Root Layout (incl. AppKitProvider)
│   └── page.tsx        # Login Page
├── components/         # Reusable UI Components
├── context/            # Global Contexts (Web3Provider)
├── lib/                # Utilities (Alchemy, Crossmint, Session, etc.)
└── public/             # Static Assets
```

## 環境変数 (.env.local)

このアプリを動作させるには、以下の環境変数が必要です。

```env
# Crossmint (Email Wallet)
CROSSMINT_API_KEY=sk_test_...

# Target NFT Collection
NEXT_PUBLIC_COLLECTION_ID=ポリゴン上のコントラクトアドレス

# Staff Authentication (Simple Secret)
STAFF_SECRET=店舗スタッフ用パスワード

# Alchemy (Blockchain Data)
ALCHEMY_API_KEY=...

# Email Service (OTP)
RESEND_API_KEY=re_...

# WalletConnect (AppKit)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...
```

## デプロイ

Netlifyへのデプロイを推奨しています。
- **Build Command**: `npm run build`
- **Publish Directory**: `.next`

※ `package-lock.json` を使用しており、`npm` でのビルドを強制するために `netlify.toml` を配置しています。

## 開発フロー

1.  **インストール**:
    ```bash
    npm install
    ```
2.  **開発サーバー起動**:
    ```bash
    npm run dev
    ```
3.  **ビルド**:
    ```bash
    npm run build
    ```

## セキュリティに関する考慮事項

- **手動入力の廃止**:
  なりすまし防止のため、ウォレットアドレスの手動入力機能は廃止しました。
- **メール認証**:
  メールアドレスでのログインにはOTP（ワンタイムパスワード）を導入し、本人確認を強化しています。
- **セッション**:
  クライアント側に秘密情報を保存せず、サーバーサイドで検証されたセッション（Cookie）を使用しています。

---
Created by Kobuke Tomohiro
