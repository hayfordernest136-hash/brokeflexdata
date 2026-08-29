const crypto = require('crypto');

function verifyWebhookSignature(rawBody, signature) {
    if (!signature) return false;

    const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    const secrets = [];
    if (webhookSecret && webhookSecret !== 'your-paystack-webhook-secret-here') {
        secrets.push(webhookSecret);
    }
    if (secretKey) {
        secrets.push(secretKey);
    }
    if (secrets.length === 0) return false;

    const bodyString = Buffer.isBuffer(rawBody) ? rawBody : (typeof rawBody === 'string' ? Buffer.from(rawBody) : Buffer.from(JSON.stringify(rawBody)));

    for (const secret of secrets) {
        const expected = crypto
            .createHmac('sha512', secret)
            .update(bodyString)
            .digest('hex');
        try {
            if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
                return true;
            }
        } catch {
            // continue to next secret
        }
    }
    return false;
}

module.exports = { verifyWebhookSignature };
