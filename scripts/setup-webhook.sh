#!/bin/bash

# Thirdweb Engine に Webhook 通知先を登録するスクリプト

# .env.localから環境変数を読み込む
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
else
  echo ".env.local 파일が見つかりません。作成してください。"
  exit 1
fi

ENGINE_URL="${THIRDWEB_ENGINE_URL}"
ACCESS_TOKEN="${THIRDWEB_ENGINE_ACCESS_TOKEN}"
WEBHOOK_URL="${NEXT_PUBLIC_APP_URL}/api/webhooks/engine"
WEBHOOK_SECRET="${THIRDWEB_WEBHOOK_SECRET:-mysecret}" # 環境変数になければデフォルト値

if [ -z "$ENGINE_URL" ] || [ -z "$ACCESS_TOKEN" ] || [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    echo "環境変数 (THIRDWEB_ENGINE_URL, THIRDWEB_ENGINE_ACCESS_TOKEN, NEXT_PUBLIC_APP_URL) が設定されていません。"
    echo "ngrokなどを使用している場合は、NEXT_PUBLIC_APP_URLにそのURLを設定してください。"
    exit 1
fi

# Engine URLに https:// が含まれていない場合は追加（念のため）
if [[ ! "$ENGINE_URL" =~ ^https?:// ]]; then
  ENGINE_URL="https://$ENGINE_URL"
fi

echo "Webhook URLを登録します: $WEBHOOK_URL"
echo "対象 Engine: $ENGINE_URL"
echo "※これまでの古い仕様と異なり、Webhookごとに専用のシークレットが自動生成されます。"

RESPONSE=$(curl -s -X POST "$ENGINE_URL/webhooks/create" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "'$WEBHOOK_URL'",
    "name": "N3 Mint Sync",
    "eventType": "mined_transaction"
  }')

echo "$RESPONSE" | jq

SECRET=$(echo "$RESPONSE" | jq -r '.result.secret | select(.!=null)')

if [ -n "$SECRET" ]; then
  echo -e "\n========================================================"
  echo -e "✅ Webhookの登録が完了しました！"
  echo -e "以下のシークレットキーをコピーし、.env.local (およびVercelの実環境) の 第三のシークレットとして設定してください:"
  echo -e "\nTHIRDWEB_WEBHOOK_SECRET=$SECRET\n"
  echo -e "設定後、必ずサーバー (npm run dev) を再起動してください。"
  echo -e "========================================================"
else
  echo -e "\n❌ 登録に失敗した可能性があります。上記のエラーを確認してください。"
fi
