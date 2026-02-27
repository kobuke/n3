# 仕様書

---

# **観光×Web3サービス「デジタル住民・貢献プラットフォーム」仕様書（案）**

## **1\. プロジェクトの目的**

南城市（南城モデル）における観光DXの推進、関係人口の創出、および収益基盤の構築を目的とする。Web3技術（NFT・トークン）を「手段」として活用し、一過性の観光客を「継続的に関与するデジタル住民」へと変容させる。

## **2\. システム全体構成**

本システムは、既存のプラットフォームをAPIでつなぎ込み、フロントエンドを独自開発する「ハイブリッド構成」を採用する。

* **基盤（Web3エンジン）:** **thirdweb** (Engine / Connect)  
  * ウォレット生成、NFT発行、ガス代肩代わり、トランザクション管理。  
* **販売（EC）:** **Shopify**  
  * NFT商品の販売、決済（クレジットカード等）、在庫管理。  
* **ユーザーフロント:** **自社開発Webアプリ ＋ LINEミニアプリ (LIFF)**  
  * マイページ、NFT表示、QR表示、ユーザー間譲渡機能。  
* **スタッフフロント:** **自社開発Webアプリ（スタッフ専用）**  
  * QRスキャナ、消し込み機能、NFT配布設定。

---

## **3\. 主要機能一覧**

### **A. ユーザー向け機能**

1. **ハイブリッド認証ウォレット:**  
   * メールアドレス認証（OTP）による自動ウォレット生成（Webブラウザ）。  
   * LINEログインによる自動ログイン・アカウント紐付け。  
   * 既存ウォレット（MetaMask等）との連携機能。  
2. **デジタル住民証（SBT）表示:**  
   * ユーザー属性や貢献度を証明する、譲渡不可なNFTの表示。  
3. **体験型NFTチケット管理:**  
   * 購入したチケットの一覧表示、有効期限確認。  
4. **QRコード提示:**  
   * スタッフによる消し込み用の動的QRコード表示。  
5. **譲渡リンク（Transfer Link）作成:**  
   * 助け合いの対価として、特定のNFTをURL形式で第3者に贈る機能。

### **B. スタッフ・管理者向け機能**

1. **QR消し込みスキャナ:**  
   * 提示されたQRを読み取り、オンチェーンでNFTの状態を「使用済み」に更新。  
2. **NFT発行・販売連携管理:**  
   * Shopifyのどの商品が売れたら、どのNFTテンプレートをミントするかを設定。  
3. **一斉配布（エアドロップ）:**  
   * 特定の条件（登録済みユーザー全員など）にNFTを一括送付。  
4. **ログ・統計管理:**  
   * NFTの販売・消し込み・ユーザー間譲渡の履歴を可視化。

---

## **4\. ユーザー体験（UX）の具体例**

### **ケース①：旅行前のオンボーディング**

* **体験:** 観光客がSNSで「南城デジタル住民」を知り、公式LINEを友だち登録する。  
* **流れ:** LINE内の「登録」ボタンを押すと、メール認証を経て即座にウォレットが作成され、初期特典の「見習い住民SBT」が付与される。  
* **効果:** 旅行前から「自分の居場所」が確保され、現地の情報が届くようになる。

### **ケース②：Shopifyでのチケット購入と現地利用**

* **体験:** Shopifyで「限定・聖地巡礼ガイドツアーNFT」をカード決済で購入。  
* **流れ:** 購入完了メールのリンクを叩くとLINEミニアプリが開き、チケットが届いていることを確認。現地でスタッフにQRコードを見せると、その場で「スタンプ」が押されるような感覚で使用済みになる。  
* **効果:** 難しい操作なしで、Web3の恩恵（限定権利の行使）を享受できる。

### **ケース③：オープンチャットでの助け合いと譲渡リンク**

* **体験:** LINEオープンチャットで「明日の早朝、絶景ポイントへの行き方を教えて」と相談。地元住民が丁寧に教える。  
* **流れ:** 相談者がお礼として、自分が持っていた「カフェ10%オフNFT」を選択し「譲渡リンク」を発行。オープンチャットに貼る。教えた人がリンクをタップすると、即座にその人のマイページへNFTが移動する。  
* **効果:** 善意の可視化と、地域内でのトークン循環が生まれる。

---

## **5\. 技術的・法的留意事項（リスク管理）**

* **ガス代の設計:** 全トランザクション（発行・消し込み・譲渡）は **thirdweb Engine** を介して運営側がガス代を負担（Gasless）し、ユーザー体験を損なわない。  
* **法規制への適合:**  
  * ユーザー間譲渡は「譲渡リンク」に限定し、システム内での日本円換金機能を持たせないことで、暗号資産交換業のリスクを回避する。  
  * トークン（MORE・もあ）は、資金決済法の「前払式支払手段」に該当しないよう、有効期限の設定（6ヶ月未満等）や用途の限定をプログラム側で制御する。  
* **セキュリティ:**  
  * QRコードはワンタイム（数分で失効）とし、スクリーンショットによる不正利用を防止する。

---

## **6\. 今後の拡張性**

* **多言語対応:** フロントエンド（Webアプリ）をNext.js等で構築するため、英語・中国語等の言語切り替えを容易にする。  
* **インバウンド対応:** LINEを持たない海外客には、メール認証＋ブラウザWebアプリで全く同じ機能（譲渡リンク受取含む）を提供する。

---

# 開発指示書

---

# **観光×Web3サービス「N3」開発設計指示書**

## **1\. システムアーキテクチャ & 技術スタック**

* **フロントエンド:** Next.js (App Router), React, Tailwind CSS  
* **バックエンド:** Next.js API Routes (Server Actions) または Node.js (Express)  
* **データベース:** PostgreSQL (Prisma ORM を推奨)  
* **Web3インフラ:** thirdweb SDK v5, thirdweb Engine (自社サーバーまたはクラウドホスティング)  
* **外部連携:** LINE LIFF SDK, Shopify Admin API & Webhooks

## **2\. thirdweb インフラ設定手順 (DevOps/インフラ担当者向け)**

本システムは、ユーザーにガス代を払わせない（Gasless）ことと、バックエンドからの自動ミントを必須とするため、**thirdweb Engine** の構築が前提となります。

1. **thirdweb Dashboardの準備:**  
   * プロジェクトを作成し、clientId と secretKey を取得。  
   * In-App Wallets (旧Embedded Wallets) を有効化し、認証方法に「Email OTP」を許可する。  
2. **thirdweb Engine のデプロイ:**  
   * Docker等を用いてEngineをサーバーにデプロイ。  
   * Engineの管理画面で「Backend Wallet（運営用ウォレット）」を生成。  
   * このBackend Walletに少額のネイティブトークン（MATIC等）を送金し、ガス代の元手とする。  
3. **スマートコントラクトのデプロイ (Polygon等のL2チェーンを推奨):**  
   * **SBT（住民証）用:** ERC-1155 (譲渡不可設定)  
   * **体験チケット用:** ERC-1155 (譲渡可能設定)  
   * ※デプロイ時、上記で作成した「Backend Wallet」に **Admin / Minter / Transfer** の権限 (Role) を付与しておくこと（重要：これによりAPI経由での操作が可能になる）。

---

## **3\. データベース設計 (Prisma Schema 例)**

バックエンドでLINE IDとウォレットアドレスを紐付けるためのコアテーブルです。

コード スニペット

// schema.prisma  
model User {  
  id            String   @id @default(uuid())  
  email         String?  @unique // OTPログイン用  
  lineId        String?  @unique // LINEログイン用  
  walletAddress String   @unique // thirdwebで生成されたアドレス  
  createdAt     DateTime @default(now())  
}

model ShopifyMapping {  
  id               String @id @default(uuid())  
  shopifyProductId String @unique  
  contractAddress  String // 発行するNFTのコントラクト  
  tokenId          String // トークンID  
}

model TransferLink {  
  id           String   @id @default(uuid())  
  token        String   @unique // URLに付与するランダム文字列  
  giverAddress String   // 送り手のウォレット  
  tokenId      String     
  status       String   @default("ACTIVE") // ACTIVE, CLAIMED, CANCELLED, EXPIRED  
  expiresAt    DateTime // 24時間後等  
}

---

## **4\. コア機能のAPI・フロー設計 (バックエンド/フロントエンド担当者向け)**

### **4.1. 認証・ウォレット生成フロー (ハイブリッド認証)**

フロントエンドでの thirdweb/react の ConnectButton ではなく、カスタムUIとLIFFを組み合わせて実装します。

* **Webブラウザからのログイン (Email OTP):**  
  1. thirdweb SDK の inAppWallet() を使用し、メールアドレスで認証。  
  2. 認証成功後、取得した walletAddress と email を自社DB (User テーブル) に保存。  
* **LINEミニアプリ(LIFF)からのログイン:**  
  1. liff.init() 実行後、liff.getProfile() で lineId を取得。  
  2. 自社API (POST /api/auth/line) へ送信。  
  3. 未登録の場合はメールアドレス入力画面へ誘導し、上記のEmail OTPを実行後、lineId と紐付ける。登録済みの場合はそのままログイン状態とする。

### **4.2. Shopify連携による自動ミント (Webhook)**

Shopifyで商品が購入された際、裏側でNFTをユーザーのウォレットに送信します。

* **エンドポイント:** POST /api/webhooks/shopify/order-create  
* **処理フロー:**  
  1. ShopifyからのWebhookを受け取り、ペイロードから customer.email と line\_items\[0\].product\_id を取得。  
  2. 自社DB (User テーブル) から email に紐づく walletAddress を検索。  
  3. ShopifyMapping テーブルから発行すべき contractAddress と tokenId を取得。  
  4. **thirdweb Engine API 呼び出し:**  
  5. HTTP

POST /contract/{chain}/{contractAddress}/erc1155/mint-to  
Headers: Authorization: Bearer \<ENGINE\_ACCESS\_TOKEN\>  
Body:  
{  
  "receiver": "\<ユーザーのwalletAddress\>",  
  "metadataWithSupply": {  
    "supply": "1",  
    "metadata": { ... } // 既に登録済みのTokenIDの場合はtokenId指定のエンドポイントを使用  
  }  
}

6.   
   7. 

### **4.3. ユーザー間譲渡リンク機能 (エスクロー方式)**

ユーザーがガス代を意識せずに安全に譲渡を行うため、一時的に「運営のBackend Wallet」がNFTを預かるエスクロー方式を採用します。

* **1\. リンク生成 (フロント \-\> バックエンド):**  
  * **エンドポイント:** POST /api/transfer/create-link  
  * **処理:**  
    1. ユーザー（送り手）はアプリ上で譲渡を承認。フロントエンドから thirdweb SDK を用いて、運営のBackend Wallet宛てにNFTを転送するトランザクションを実行（In-App Walletの署名）。  
    2. バックエンドはDBの TransferLink テーブルにランダムな token を生成し保存。  
    3. フロントエンドに https://n3-app.com/claim?token=XXXX を返す。  
* **2\. 受け取り (フロント \-\> バックエンド):**  
  * **エンドポイント:** POST /api/transfer/claim  
  * **処理:**  
    1. 受け手がリンクを踏み、ログイン（または新規登録）して自分の walletAddress をバックエンドへ送信。  
    2. バックエンドはDBで token が ACTIVE か確認。  
    3. **thirdweb Engine API 呼び出し:** 運営のBackend Walletから受け手のウォレットへNFTを転送。  
    4. HTTP

POST /contract/{chain}/{contractAddress}/erc1155/transfer  
Body: {  
  "to": "\<受け手のwalletAddress\>",  
  "tokenId": "\<tokenId\>",  
  "amount": "1"  
}

5.   
   6.   
      7. DBのステータスを CLAIMED に更新。

### **4.4. 現場でのQRコード消し込み機能**

スタッフ用アプリで読み取るQRには、動的な署名（数分で期限切れ）を含めます。

* **1\. QRコード表示 (ユーザー側UI):**  
  * フロントエンドでJWTまたはランダムなワンタイムトークンを生成し、QRコード化。ペイロードには { walletAddress, tokenId, timestamp } を含める。  
* **2\. 消し込み実行 (スタッフ用アプリ \-\> バックエンド):**  
  * **エンドポイント:** POST /api/staff/burn-ticket  
  * **処理:**  
    1. スタッフがQRをスキャンし、データをバックエンドへ送信。  
    2. タイムスタンプを検証し、期限切れ（例: 5分以上経過）ならエラーを返す。  
    3. **thirdweb Engine API 呼び出し:** (Burn処理、またはメタデータの更新)  
    4. HTTP

POST /contract/{chain}/{contractAddress}/erc1155/burn-from  
// ※事前にユーザー側で運営ウォレットへのApprovalが必要。  
// または、運用をシンプルにするために独自のSBTを発行して「使用済み」を証明する方法でも可。

5.   
   6. 

## **5\. 開発の優先順位（フェーズ分けの提案）**

* **Phase 1 (基盤構築):** thirdweb Engineの立ち上げ、Email / LINE認証によるウォレット生成・DB連携の完成。  
* **Phase 2 (EC連携):** Shopify Webhookの実装、Engine経由の自動ミント機能。  
* **Phase 3 (現場実務):** QRコードの表示と、スタッフ用アプリでのスキャン・消し込み処理の実装。  
* **Phase 4 (コミュニティ機能):** 譲渡リンク（エスクロー処理）の実装。

---

**エンジニアの方へ（ディレクターからのメッセージ）:**

本プロジェクトはWeb3の専門知識がない一般ユーザー（観光客・地元住民）が対象です。そのため、「署名ポップアップ」や「ガス代の支払い」などのWeb3特有の操作はすべて裏側（thirdweb EngineとIn-App Wallets）に隠蔽する設計としています。APIの疎通と、LINE連携によるシームレスな体験の構築を最優先事項として開発を進めてください。不明点があれば Engine の公式ドキュメント（REST APIリファレンス）を参照してください。

---

# ピボット開発 指示書

---

# **「N3」ピボット開発 指示書（既存コードベースからの移行）**

## **1\. プロジェクト概要と移行方針**

本プロジェクトは、既存リポジトリ「Nanjo NFT Wallet」をフォークし、南城市の要件（N3仕様）に合わせて拡張・改修を行うピボット開発です。

**【最大の変更点】**

Web3インフラ（ウォレット管理・ミント・API）を **Crossmint から thirdweb (SDK v5 \+ Engine) へ全面リプレイス** します。また、認証基盤に **LINE連携（LIFF）** を追加し、新機能として **ユーザー間譲渡（譲渡リンク）** を実装します。

UIコンポーネント（Shadcn UI等）やスタッフ管理画面のガワ、Supabaseの基本構成は極力流用します。

---

## **2\. 開発フェーズと具体的な指示内容**

### **Phase 1: Web3インフラの全面移行 (Crossmint → thirdweb)**

既存の lib/crossmint.ts に依存している処理をすべて破棄し、thirdwebに置き換えます。

* **\[破棄\]** lib/crossmint.ts および、Crossmint APIを叩いているすべての処理。  
* **\[新設\]** lib/thirdweb.ts を作成し、以下の thirdweb Engine API を叩く関数を実装してください。  
  * mintTo (Shopifyからの自動ミント用)  
  * transfer (譲渡リンクの受取・エスクロー用)  
  * burn (またはメタデータ更新。QR消し込み用)  
* **\[変更\]** NFTデータ取得 (lib/alchemy.ts): Alchemyを継続使用しても良いですが、thirdweb SDKの getContract および getNFTs に置き換えると依存関係を減らせます。

### **Phase 2: 認証基盤の拡張（LINE LIFF ＋ thirdweb In-App Wallet）**

既存の Resend による独自OTP実装を、thirdwebのIn-App Wallet（旧Embedded Wallet）とLINE連携のハイブリッドに改修します。

* **\[変更\] ユーザー認証フロー:**  
  * 既存の /api/auth/send-otp, /verify-otp を、**thirdweb SDK の In-App Wallet (Email OTP) に置き換え**てください。これにより、認証完了と同時にウォレットアドレスが確定します。  
* **\[新設\] LINE LIFF 連携:**  
  * フロントエンドに LINE LIFF SDK (@line/liff) を導入。  
  * 新規エンドポイント POST /api/auth/line を作成。LIFFから取得した lineId を受け取り、DBを照合します。  
  * **未登録時:** メール認証画面へ誘導し、Email OTP完了後に lineId と email (および生成された walletAddress) をSupabaseに紐付けて保存。  
  * **登録済時:** そのままセッションを確立し /mypage へ遷移。

### **Phase 3: 新機能「譲渡リンク（Transfer Link）」の実装**

N3の目玉機能である、ユーザー間のNFT譲渡（エスクロー方式）を実装します。**※ガス代はすべて運営(Engine)負担(Gasless)とします。**

* **\[新設\] APIエンドポイント:**  
  * POST /api/transfer/create-link: ユーザーのウォレットから「運営用 Backend Wallet (エスクロー)」へNFTをTransferし、DBにランダムな token と有効期限を保存。発行したURL（例: /claim?token=XYZ）を返す。  
  * POST /api/transfer/claim: 受け手がURLを踏み、認証完了後に実行。DBの token を検証し、運営用 Backend Wallet から受け手の walletAddress へNFTをTransfer（Engine経由）。  
* **\[新設\] UI:**  
  * マイページのチケット詳細 (/mypage/\[nftId\]) に「譲渡リンクを作成」ボタンを追加。  
  * 受け取り用のページ (/claim/page.tsx) を作成。

### **Phase 4: 既存API・機能の第三者(thirdweb)対応**

* **Shopify Webhook (/api/webhooks/shopify)の改修:**  
  * 購入検知後、Crossmintではなく **thirdweb Engine** の mintTo エンドポイントを叩くようロジックを変更。  
* **QR消し込み (/api/use-ticket ＆ /staff/scan) の改修:**  
  * 既存ロジック（おそらく自社DBのステータス更新やCrossmintのメタデータ更新）を、**thirdweb経由でのBurn（焼却）またはコントラクト上のステータス更新**に書き換え。  
* **Discord連携 (/api/auth/discord 等):**  
  * ロジックはそのまま流用可能ですが、参照するウォレットアドレスがthirdwebのものになる点のみ注意してください。

---

## **3\. データベース (Supabase) のマイグレーション指示**

既存のスキーマに以下のカラム・テーブルを追加（または変更）してください。

1. **users テーブル (新規作成 または 既存拡張):**  
   * これまではウォレットベースの認証だったものを、アカウントベースに移行するため必要です。  
   * カラム: id (UUID), email (String, Unique), lineId (String, Unique), walletAddress (String, Unique)  
2. **transfer\_links テーブル (新規作成):**  
   * 譲渡リンク管理用。  
   * カラム: id, token (String, Unique), giverAddress (String), tokenId (String), status (Enum: ACTIVE, CLAIMED, EXPIRED), expiresAt (DateTime)

---

## **4\. 環境変数 (.env.local) の整理**

**【削除するもの】**

* CROSSMINT\_API\_KEY

**【追加するもの】**

* NEXT\_PUBLIC\_THIRDWEB\_CLIENT\_ID (ダッシュボードで取得)  
* THIRDWEB\_SECRET\_KEY  
* THIRDWEB\_ENGINE\_URL (デプロイしたEngineのURL)  
* THIRDWEB\_ENGINE\_ACCESS\_TOKEN  
* NEXT\_PUBLIC\_LIFF\_ID (LINE Developersで取得)

---

## **5\. 開発の進め方（推奨ステップ）**

1. **環境構築:** thirdwebダッシュボードの設定と、Engineのデプロイ（またはローカルテスト環境構築）を先行する。  
2. **認証リプレイス:** Email OTPのthirdweb化とLIFFログインの実装（Phase 2）。ここが通らないと後の機能が動かないため最優先。  
3. **管理機能の繋ぎ込み:** Shopifyからの自動ミントと、QRスキャンのthirdweb化（Phase 4）。  
4. **新規機能実装:** 譲渡リンク（Phase 3）。

---

### **ディレクターからの補足コメント**

既存のUIと「スタッフ用管理画面」の仕組み（マッピング機能など）は非常によく出来ているため、基本的には **「裏側のAPIの繋ぎ先を変える」作業** がメインとなります。まずは Crossmint を完全に剥がし、thirdweb Engine での Gasless トランザクションが通るかを検証してください。

