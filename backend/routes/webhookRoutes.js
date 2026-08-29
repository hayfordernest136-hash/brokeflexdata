const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { verifyWebhookSignature } = require('../middleware/webhookSignature');
const { logInfo, logError, logWarn } = require('../utils/logger');

router.post('/paystack', express.raw({ type: 'application/json' }), (req, res, next) => {
    const signature = req.headers['x-paystack-signature'];
    let rawBody = req.body;

    if (typeof rawBody === 'object' && !Buffer.isBuffer(rawBody)) {
        rawBody = JSON.stringify(rawBody);
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
        logWarn('Paystack webhook: invalid signature');
        return res.status(401).send('Invalid signature');
    }

    try {
        req.body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    } catch (err) {
        logError('Webhook: failed to parse JSON body');
        return res.status(400).send('Invalid JSON');
    }

    next();
}, webhookController.handlePaystackWebhook);

module.exports = router;
