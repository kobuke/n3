
/**
 * Verifies the Shopify HMAC signature.
 * 
 * @param hmac The HMAC header from the request.
 * @param rawBody The raw body of the request.
 * @param secret The Shopify Webhook Secret.
 * @returns true if the signature is valid, false otherwise.
 */
import crypto from 'crypto';

export function verifyShopifyWebhook(hmac: string | null, rawBody: string, secret: string): boolean {
    if (!hmac || !secret || !rawBody) {
        return false;
    }
    const hash = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}
