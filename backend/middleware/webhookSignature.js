const crypto = require('crypto');

function verifyWebhookSignature(rawBody, signature) {
    if (!signature) return false;
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return false;
    const expected = crypto
        .createHmac('sha512', secret)
        .update(rawBody)
        .digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
        return false;
    }
}

module.exports = { verifyWebhookSignature };
