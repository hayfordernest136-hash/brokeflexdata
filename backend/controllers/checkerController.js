const checkerService = require('../services/checkerService');
const { ResultCheckerOrder } = require('../models/ResultCheckerOrder');
const { logError, logInfo } = require('../utils/logger');

function formatCheckerOrderResponse(order) {
    return {
        id: order.id,
        reference: order.reference,
        checkerType: order.checker_type,
        phoneNumber: order.phone_number,
        email: order.email,
        datamartCost: order.datamart_cost,
        markupPercentage: order.markup_percentage,
        sellingPrice: order.selling_price,
        amount: order.amount,
        amountPesewas: order.amount_pesewas,
        paystackFee: order.paystack_fee,
        paystackAmount: order.paystack_amount,
        paymentReference: order.payment_reference,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        datamartPurchaseId: order.datamart_purchase_id,
        datamartReference: order.datamart_reference,
        datamartTransactionId: order.datamart_transaction_id,
        serialNumber: order.serial_number,
        pin: order.pin,
        datamartResponse: order.datamart_response,
        createdAt: order.created_at,
        updatedAt: order.updated_at
    };
}

async function getCheckerProducts(req, res, next) {
    try {
        const products = await checkerService.getCheckerProducts();
        res.json({
            status: 'success',
            data: products
        });
    } catch (err) {
        logError(`Checker products fetch error: ${err.message}`);
        next(err);
    }
}

async function createCheckerOrder(req, res, next) {
    try {
        const { checkerType, phoneNumber, email } = req.body;

        if (!checkerType) {
            return res.status(400).json({ status: 'error', message: 'Checker type is required.' });
        }

        if (!phoneNumber) {
            return res.status(400).json({ status: 'error', message: 'Phone number is required.' });
        }

        if (!email) {
            return res.status(400).json({ status: 'error', message: 'Email is required.' });
        }

        const order = await checkerService.createCheckerOrder(checkerType, phoneNumber, email);

        res.status(201).json({
            status: 'success',
            message: 'Checker order created.',
            data: {
                reference: order.reference,
                checkerType: order.checker_type,
                phoneNumber: order.phone_number,
                email: order.email,
                amount: order.amount,
                amountPesewas: order.amount_pesewas,
                paymentReference: order.payment_reference,
                sellingPrice: order.selling_price,
                paystackFee: order.paystack_fee,
                paystackAmount: order.paystack_amount,
                datamartCost: order.datamart_cost,
                markupPercentage: order.markup_percentage
            }
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ status: 'error', message: err.message });
        }
        next(err);
    }
}

async function initiateCheckerPayment(req, res, next) {
    let order = null;
    try {
        const { reference } = req.params;

        if (!reference) {
            return res.status(400).json({ status: 'error', message: 'Order reference is required.' });
        }

        order = await ResultCheckerOrder.getByReference(reference);
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Checker order not found.' });
        }

        if (order.payment_status === 'successful') {
            return res.status(400).json({
                status: 'error',
                message: 'Payment already completed for this order.'
            });
        }

        const paymentIntent = await checkerService.initiateCheckerPayment(order);

        res.json({
            status: 'success',
            data: {
                authorizationUrl: paymentIntent.authorizationUrl,
                reference: paymentIntent.reference,
                orderReference: order.reference,
                amount: order.selling_price,
                paystackAmount: order.paystack_amount,
                paystackFee: order.paystack_fee,
                checkerType: order.checker_type
            }
        });
    } catch (err) {
        if (err.status === 401 || err.status === 403) {
            logError(`Payment provider auth error for checker order ${order?.reference}: ${err.message}`);
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

async function verifyCheckerPayment(req, res, next) {
    try {
        const { reference, paystackReference } = req.params;

        if (!reference || !paystackReference) {
            return res.status(400).json({ status: 'error', message: 'Order reference and payment reference are required.' });
        }

        const orderCheck = await ResultCheckerOrder.getByReference(reference);
        if (!orderCheck) {
            return res.status(404).json({ status: 'error', message: 'Checker order not found.' });
        }

        try {
            const result = await checkerService.processCheckerPaymentVerification(orderCheck.payment_reference);

            if (result.alreadyProcessed) {
                return res.json({
                    status: 'success',
                    data: {
                        order: formatCheckerOrderResponse(result.order),
                        alreadyProcessed: true,
                        message: result.message
                    }
                });
            }

            if (result.paymentStatus === 'failed') {
                return res.json({
                    status: 'success',
                    data: {
                        order: formatCheckerOrderResponse(result.order),
                        paymentStatus: 'failed',
                        message: 'Payment was not successful.'
                    }
                });
            }

            res.json({
                status: 'success',
                data: {
                    order: formatCheckerOrderResponse(result.order),
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

async function getCheckerOrder(req, res, next) {
    try {
        const { reference } = req.params;

        const order = await checkerService.getCheckerOrderDetails(reference);

        res.json({
            status: 'success',
            data: formatCheckerOrderResponse(order)
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ status: 'error', message: err.message });
        }
        next(err);
    }
}

async function checkCheckerStatus(req, res, next) {
    try {
        const { reference } = req.params;

        const datamartStatus = await checkerService.checkResultCheckerStatus(reference);

        res.json({
            status: 'success',
            data: datamartStatus
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ status: 'error', message: err.message });
        }
        next(err);
    }
}

module.exports = {
    getCheckerProducts,
    createCheckerOrder,
    initiateCheckerPayment,
    verifyCheckerPayment,
    getCheckerOrder,
    checkCheckerStatus,
    formatCheckerOrderResponse
};
