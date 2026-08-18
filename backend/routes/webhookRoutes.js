const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { verifyWebhookSignature } = require('../middleware/webhookSignature');
const { logInfo, logError } = require('../utils/logger');

router.post('/paystack', express.raw({ type: 'application/json' }), (req, res, next) => {
    const signature = req.headers['x-paystack-signature'];
    const rawBody = req.body;

    if (!verifyWebhookSignature(rawBody, signature)) {
        logWarn('Paystack webhook: invalid signature');
        return res.status(401).send('Invalid signature');
    }

    try {
        req.body = JSON.parse(rawBody.toString('utf8'));
    } catch (err) {
        logError('Webhook: failed to parse JSON body');
        return res.status(400).send('Invalid JSON');
    }

    next();
}, webhookController.handlePaystackWebhook);

module.exports = router;
