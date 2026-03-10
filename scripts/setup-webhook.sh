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

echo "Webhook URLを登録します: $WEBHOOK_URL"
echo "対象 Engine: $ENGINE_URL"

curl -X POST "$ENGINE_URL/configuration/webhooks" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "'$WEBHOOK_URL'",
    "secret": "'$WEBHOOK_SECRET'",
    "eventType": "mined_transaction"
  }'

echo -e "\n\n完了しました。"
