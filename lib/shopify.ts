import crypto from 'crypto';
import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_CLIENT_ID || '',
  apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET || '',
  scopes: ['read_products'],
  hostName: process.env.SHOPIFY_SHOP_DOMAIN || '',
  apiVersion: ApiVersion.January25,
  isEmbeddedApp: false,
});

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Client Credentials Grantを使用して新しいアクセストークンを取得またはキャッシュから返す
 */
export async function getShopifyAccessToken(): Promise<string> {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!shopDomain || !clientId || !clientSecret) {
    throw new Error('Shopify credentials are not fully configured in environment variables');
  }

  // 5分のバッファを持たせて有効期限をチェック
  if (cachedToken && Date.now() < tokenExpiresAt - 300000) {
    return cachedToken;
  }

  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    }),
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch Shopify access token:', errorText);
    throw new Error(`Failed to fetch Shopify access token: ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);

  return cachedToken!;
}

/**
 * 取得したアクセストークンを用いてShopify RestClientを初期化する
 */
export async function getShopifyRestClient() {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || '';
  const token = await getShopifyAccessToken();

  const session = new Session({
    id: `offline_${shopDomain}`,
    shop: shopDomain,
    state: 'none',
    isOnline: false,
    accessToken: token,
  });

  return new shopify.clients.Rest({ session });
}

/**
 * Verifies the Shopify HMAC signature.
 * 
 * @param hmac The HMAC header from the request.
 * @param rawBody The raw body of the request.
 * @param secret The Shopify Webhook Secret.
 * @returns true if the signature is valid, false otherwise.
 */
export function verifyShopifyWebhook(hmac: string | null, rawBody: string, secret: string): boolean {
    if (!hmac || !secret || !rawBody) {
        return false;
    }
    const hash = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}
