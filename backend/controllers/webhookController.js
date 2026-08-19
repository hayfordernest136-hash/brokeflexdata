const orderService = require('../services/orderService');
const checkerService = require('../services/checkerService');
const { Order } = require('../models/Order');
const { ResultCheckerOrder } = require('../models/ResultCheckerOrder');
const { logInfo, logError, logWarn } = require('../utils/logger');
const { ghanaToPesewas } = require('../utils/pricing');

async function handlePaystackWebhook(req, res) {
    const payload = req.body;
    const event = payload.event;
    logInfo(`Paystack webhook received: ${event}`);

    if (event === 'charge.success' || event === 'charge.confirmed') {
        const data = payload.data;
        const reference = data.reference;

        let order = null;
        let isCheckerOrder = false;

        try {
            order = await Order.getByPaymentReference(reference);
            if (order) {
                isCheckerOrder = false;
            } else {
                const checkerOrder = await ResultCheckerOrder.getByPaymentReference(reference);
                if (checkerOrder) {
                    order = checkerOrder;
                    isCheckerOrder = true;
                }
            }
        } catch (err) {
            logError(`Paystack webhook: error looking up order for reference ${reference}: ${err.message}`);
            return res.status(500).send('Error processing webhook');
        }

        if (!order) {
            logError(`Paystack webhook: order not found for reference ${reference}`);
            return res.status(200).send('OK');
        }

        if (order.payment_status === 'successful') {
            logInfo(`Paystack webhook: payment already processed for ${order.reference}`);
            return res.status(200).send('OK');
        }

        const expectedAmount = ghanaToPesewas(order.paystack_amount || order.amount);
        if (data.amount !== expectedAmount) {
            logError(`Paystack webhook: amount mismatch for order ${order.reference}: expected ${expectedAmount}, got ${data.amount}`);
            if (isCheckerOrder) {
                await ResultCheckerOrder.update(order.reference, {
                    payment_status: 'failed',
                    datamart_response: JSON.stringify({ error: 'Webhook amount mismatch', expected: expectedAmount, received: data.amount })
                });
            } else {
                await Order.update(order.reference, {
                    payment_status: 'failed',
                    datamart_response: JSON.stringify({ error: 'Webhook amount mismatch', expected: expectedAmount, received: data.amount })
                });
            }
            return res.status(200).send('OK');
        }

        if (isCheckerOrder) {
            await ResultCheckerOrder.update(order.reference, { payment_status: 'successful' });
            logInfo(`Paystack webhook: payment verified for checker order ${order.reference}`);

            const updatedOrder = await ResultCheckerOrder.getByReference(order.reference);
            if (order.fulfillment_status === 'pending' || order.fulfillment_status === 'processing' || order.fulfillment_status === 'fulfillment_pending') {
                await checkerService.fulfillCheckerOrder(updatedOrder).catch(err => {
                    logError(`Webhook checker fulfillment error for ${order.reference}: ${err.message}`);
                });
            }
        } else {
            await Order.update(order.reference, { payment_status: 'successful' });
            logInfo(`Paystack webhook: payment verified for order ${order.reference}`);

            if (order.fulfillment_status === 'pending' || order.fulfillment_status === 'processing') {
                const updatedOrder = await Order.getByReference(order.reference);
                await orderService.fulfillOrder(updatedOrder).catch(err => {
                    logError(`Webhook fulfillment error for ${order.reference}: ${err.message}`);
                });
            }
        }

        return res.status(200).send('OK');
    }

    if (event === 'charge.failed') {
        const data = payload.data;
        const reference = data.reference;

        try {
            const order = await Order.getByPaymentReference(reference);
            const checkerOrder = await ResultCheckerOrder.getByPaymentReference(reference);

            let targetOrder = order;
            let isChecker = false;

            if (!targetOrder && checkerOrder) {
                targetOrder = checkerOrder;
                isChecker = true;
            }

            if (targetOrder) {
                if (isChecker) {
                    await ResultCheckerOrder.update(targetOrder.reference, { payment_status: 'failed' });
                } else {
                    await Order.update(targetOrder.reference, { payment_status: 'failed' });
                }
                logWarn(`Paystack webhook: payment failed for order ${targetOrder.reference}`);
            }
        } catch (err) {
            logError(`Paystack webhook failed-charge processing error: ${err.message}`);
        }

        return res.status(200).send('OK');
    }

    res.status(200).send('OK');
}

module.exports = {
    handlePaystackWebhook
};
