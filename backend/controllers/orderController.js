const orderService = require('../services/orderService');
const { Order } = require('../models/Order');
const { logError } = require('../utils/logger');

async function createOrder(req, res, next) {
    try {
        const { network, bundleCapacity, bundleCapacityString, phoneNumber, email, contactNumber } = req.body;

        if (!network) {
            return res.status(400).json({ status: 'error', message: 'Network is required.' });
        }

        if (!bundleCapacity && !bundleCapacityString) {
            return res.status(400).json({ status: 'error', message: 'Bundle selection is required.' });
        }

        if (!phoneNumber) {
            return res.status(400).json({ status: 'error', message: 'Phone number is required.' });
        }

        if (!email) {
            return res.status(400).json({ status: 'error', message: 'Email is required.' });
        }

        const bundle = {
            capacity: parseInt(bundleCapacity) || parseInt(bundleCapacityString),
            capacity_string: bundleCapacityString || (parseInt(bundleCapacity) || '').toString(),
        };

        const order = await orderService.createOrder(network, bundle, phoneNumber, email, contactNumber);

        res.status(201).json({
            status: 'success',
            message: 'Order created.',
            data: {
                reference: order.reference,
                amount: order.amount,
                amountPesewas: order.amount_pesewas,
                network: order.network,
                phoneNumber: order.phone_number,
                email: order.email,
                paymentReference: order.payment_reference,
                sellingPrice: order.selling_price,
                paystackFee: order.paystack_fee,
                paystackAmount: order.paystack_amount
            }
        });
    } catch (err) {
        logError(`Order creation failed: ${err.message}`);
        logError(`Error stack: ${err.stack}`);
        if (err.status) {
            return res.status(err.status).json({ status: 'error', message: err.message });
        }
        next(err);
    }
}

async function initiatePayment(req, res, next) {
    let order = null;
    try {
        const { reference } = req.params;

        if (!reference) {
            return res.status(400).json({ status: 'error', message: 'Order reference is required.' });
        }

        order = await Order.getByReference(reference);
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        if (order.payment_status === 'successful') {
            return res.status(400).json({
                status: 'error',
                message: 'Payment already completed for this order.'
            });
        }

        const paymentIntent = await orderService.initiatePayment(order);

        res.json({
            status: 'success',
            data: {
                authorizationUrl: paymentIntent.authorizationUrl,
                reference: paymentIntent.reference,
                orderReference: order.reference,
                amount: order.selling_price,
                paystackAmount: order.paystack_amount,
                paystackFee: order.paystack_fee
            }
        });
    } catch (err) {
        logError(`Payment initiation failed for order ${order?.reference || 'unknown'}: ${err.message}`);
        logError(`Error stack: ${err.stack}`);
        if (err.status === 401 || err.status === 403) {
            logError(`Payment provider auth error for order ${order?.reference}: ${err.message}`);
            return res.status(502).json({
                status: 'error',
                message: 'Unable to process payment at this time. Please try again later.'
            });
        }
        if (err.status) {
            return res.status(err.status).json({ status: 'error', message: err.message });
        }
        next(err);
    }
}
        next(err);
    }
}

async function verifyPayment(req, res, next) {
    try {
        const { reference, paystackReference } = req.params;

        if (!reference || !paystackReference) {
            return res.status(400).json({ status: 'error', message: 'Order reference and payment reference are required.' });
        }

        const orderCheck = await Order.getByReference(reference);
        if (!orderCheck) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        try {
            const result = await orderService.processPaymentVerification(orderCheck.payment_reference);

            if (result.alreadyProcessed) {
                return res.json({
                    status: 'success',
                    data: {
                        order: formatOrderResponse(result.order),
                        alreadyProcessed: true,
                        message: result.message
                    }
                });
            }

            if (result.paymentStatus === 'failed') {
                return res.json({
                    status: 'success',
                    data: {
                        order: formatOrderResponse(result.order),
                        paymentStatus: 'failed',
                        message: 'Payment was not successful.'
                    }
                });
            }

            res.json({
                status: 'success',
                data: {
                    order: formatOrderResponse(result.order),
                    paymentStatus: 'successful',
                    fulfillmentStatus: result.fulfillmentResult ?
                        result.fulfillmentResult.fulfillmentStatus :
                        result.order.fulfillment_status
                }
            });
        } catch (verifyErr) {
            if (verifyErr.status) {
                return res.status(verifyErr.status).json({
                    status: 'error',
                    message: verifyErr.message
                });
            }
            next(verifyErr);
        }
    } catch (err) {
        next(err);
    }
}

async function getOrder(req, res, next) {
    try {
        const { reference } = req.params;

        const order = await orderService.getOrderDetails(reference);

        res.json({
            status: 'success',
            data: formatOrderResponse(order)
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ status: 'error', message: err.message });
        }
        next(err);
    }
}

function formatOrderResponse(order) {
    return {
        id: order.id,
        reference: order.reference,
        network: order.network,
        networkCode: order.network_code,
        bundleCapacity: order.bundle_capacity,
        bundleCapacityString: order.bundle_capacity_string,
        bundlePrice: order.selling_price,
        datamartCost: order.datamart_cost,
        markupPercentage: order.markup_percentage,
        sellingPrice: order.selling_price,
        paystackFee: order.paystack_fee,
        paystackAmount: order.paystack_amount,
        phoneNumber: order.phone_number,
        email: order.email,
        contactNumber: order.contact_number,
        amount: order.amount,
        amountPesewas: order.amount_pesewas,
        paymentReference: order.payment_reference,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        datamartPurchaseId: order.datamart_purchase_id,
        datamartOrderReference: order.datamart_order_reference,
        datamartTransactionReference: order.datamart_transaction_reference,
        createdAt: order.created_at,
        updatedAt: order.updated_at
    };
}

module.exports = {
    createOrder,
    initiatePayment,
    verifyPayment,
    getOrder,
    formatOrderResponse
};
