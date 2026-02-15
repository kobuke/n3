const crypto = require('crypto');

// Configuration
const SECRET = 'test_secret_12345'; // Matching the temporary secret in .env.local
const URL = 'http://localhost:3000/api/webhooks/shopify';

const payload = {
    id: 123456789,
    email: "test@example.com",
    created_at: new Date().toISOString(),
    line_items: [
        {
            id: 987654321,
            variant_id: 11223344,
            title: "Test Product",
            quantity: 1,
            sku: "TEST-SKU",
            product_id: 8783693643974 // REPLACE THIS WITH A REAL PRODUCT ID YOU HAVE MAPPED
        }
    ],
    note_attributes: []
};

const body = JSON.stringify(payload);
const hmac = crypto.createHmac('sha256', SECRET).update(body, 'utf8').digest('base64');

console.log('--- Shopify Webhook Simulator ---');
console.log('Target URL:', URL);
console.log('HMAC Header:', hmac);
console.log('Sending payload for Product ID:', payload.line_items[0].product_id);

fetch(URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-Sha256': hmac,
        'X-Shopify-Topic': 'orders/paid',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com',
    },
    body: body
})
    .then(async res => {
        const text = await res.text();
        console.log(`\nStatus: ${res.status} ${res.statusText}`);
        console.log(`Response: ${text}`);
        console.log('\nCheck your terminal (where npm run dev is running) and Supabase logs for results.');
    })
    .catch(err => {
        console.error('\nError connecting to your local server.');
        console.error('Make sure "npm run dev" is running at localhost:3000');
        console.error(err.message);
    });
