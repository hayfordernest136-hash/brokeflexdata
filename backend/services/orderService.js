const { Order } = require('../models/Order');
const { generateReference } = require('../utils/generateReference');
const { validateGhanaPhoneNumber, validateEmail, NETWORK_MAP, getNetworkCode } = require('../utils/validation');
const { calculateSellingPrice, calculatePaystackFee, ghanaToPesewas, pesewasToGhana } = require('../utils/pricing');
const { logInfo, logError, logWarn } = require('../utils/logger');
const paystackService = require('./paystackService');
const datamartService = require('./datamartService');
const emailService = require('./emailService');

const BUNDLE_CACHE_DURATION = 1000 * 60;
let bundleCache = null;
let bundleCacheTime = 0;

async function validateOrderInput(network, bundleCapacity, phoneNumber, email) {
    if (!network || !NETWORK_MAP[network]) {
        return { valid: false, error: { status: 400, message: 'Invalid network selection.' } };
    }

    if (!bundleCapacity) {
        return { valid: false, error: { status: 400, message: 'Please select a data bundle.' } };
    }

    const phoneResult = validateGhanaPhoneNumber(phoneNumber);
    if (!phoneResult.valid) {
        return { valid: false, error: { status: 400, message: phoneResult.message } };
    }

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
        return { valid: false, error: { status: 400, message: emailResult.message } };
    }

    return {
        valid: true,
        networkCode: NETWORK_MAP[network],
        phoneNumber: phoneResult.normalized,
        email: emailResult.normalized
    };
}

async function getCachedBundles(networkCode) {
    const now = Date.now();
    if (bundleCache && (now - bundleCacheTime < BUNDLE_CACHE_DURATION) && bundleCache[networkCode]) {
        return bundleCache[networkCode];
    }

    const packagesData = await datamartService.getDataPackages();
    if (!packagesData || packagesData.status !== 'success') {
        throw new Error('Failed to fetch data packages from provider');
    }

    const allData = packagesData.data || {};
    const networks = ['YELLO', 'TELECEL', 'AT_PREMIUM'];
    const cache = {};

    for (const netCode of networks) {
        cache[netCode] = allData[netCode] || [];
    }

    bundleCache = cache;
    bundleCacheTime = now;

    return cache[networkCode] || [];
}

function findBundleByCapacity(bundles, capacity) {
    const targetCap = Number(capacity);
    return bundles.find(pkg => Number(pkg.capacity) === targetCap);
}

async function createOrder(network, bundle, phoneNumber, email, contactNumber) {
    const validation = await validateOrderInput(
        network,
        bundle.capacity,
        phoneNumber,
        email
    );

    if (!validation.valid) {
        throw validation.error;
    }

    const networkCode = validation.networkCode;

    const datamartBundles = await getCachedBundles(networkCode);
    const datamartBundle = findBundleByCapacity(datamartBundles, bundle.capacity);

    if (!datamartBundle) {
        throw {
            status: 400,
            message: 'Selected bundle is no longer available. Please select another bundle.'
        };
    }

    const datamartCost = Number(datamartBundle.price);

    const pricing = calculateSellingPrice(datamartCost);
    const paystackCalc = calculatePaystackFee(pricing.sellingPricePesewas);

    const reference = generateReference();
    const paymentReference = generateReference('ps');

    const order = await Order.create({
        reference,
        network: network,
        network_code: validation.networkCode,
        bundle_capacity: bundle.capacity,
        bundle_capacity_string: bundle.capacity.toString(),
        bundle_price: pricing.sellingPrice,
        phone_number: validation.phoneNumber,
        email: validation.email,
        contact_number: contactNumber || null,
        amount: pricing.sellingPrice,
        amount_pesewas: pricing.sellingPricePesewas,
        payment_reference: paymentReference,
        payment_status: 'pending',
        fulfillment_status: 'pending',
        datamart_cost: pricing.datamartCost,
        markup_percentage: pricing.markup,
        selling_price: pricing.sellingPrice,
        paystack_fee: paystackCalc.paystackFee,
        paystack_amount: paystackCalc.paystackAmount
    });

    logInfo(`Order created: ${reference} for ${network} ${bundle.capacity}GB`);
    logInfo(`  DataMart cost: ${pricing.datamartCost} GHS`);
    logInfo(`  Selling price: ${pricing.sellingPrice} GHS (${pricing.markup}% markup)`);
    logInfo(`  Paystack amount: ${paystackCalc.paystackAmount} GHS (fee: ${paystackCalc.paystackFee} GHS)`);

    await emailService.sendAdminNotification(order, 'order_created').catch(err => {
        logError(`Failed to send order creation notification: ${err.message}`);
    });

    return order;
}

async function initiatePayment(order) {
    const paystackPayload = {
        email: order.email,
        amount: ghanaToPesewas(order.paystack_amount || order.amount),
        currency: 'GHS',
        reference: order.payment_reference,
        callback_url: `${process.env.FRONTEND_URL}/checkout?callback_ref=${order.reference}`
    };

    const paystackResponse = await paystackService.initializeTransaction(paystackPayload);

    if (paystackResponse.status && paystackResponse.data) {
        logInfo(`Paystack transaction initialized for order ${order.reference}, paystack ref: ${paystackResponse.data.reference}`);
        return {
            authorizationUrl: paystackResponse.data.authorization_url,
            reference: paystackResponse.data.reference
        };
    }

    throw new Error(paystackResponse.message || 'Failed to initialize payment');
}

async function processPaymentVerification(paystackReference) {
    const order = await Order.getByPaymentReference(paystackReference);

    if (!order) {
        throw { status: 404, message: 'Order not found for this payment reference.' };
    }

    if (order.payment_status === 'successful') {
        logInfo(`Payment already verified for order ${order.reference}`);
        return {
            order,
            alreadyProcessed: true,
            message: 'Payment already verified.'
        };
    }

    const verification = await paystackService.verifyTransaction(paystackReference);

    if (!verification.status || !verification.data) {
        throw { status: 400, message: 'Payment verification failed. Please try again.' };
    }

    const paymentData = verification.data;

    if (paymentData.status !== 'success') {
        await Order.update(order.reference, { payment_status: 'failed' });
        await Order.auditLog(order.reference, 'payment_status', 'pending', 'failed', 'paystack');
        logWarn(`Payment failed for order ${order.reference}: status=${paymentData.status}`);

        const failedOrder = await Order.getByReference(order.reference);
        await emailService.sendAdminNotification(failedOrder, 'payment_failed').catch(e => {
            logError(`Failed to send admin notification: ${e.message}`);
        });
        await emailService.sendPaymentFailed(failedOrder).catch(e => {
            logError(`Failed to send payment failed email: ${e.message}`);
        });

        return {
            order: failedOrder,
            paymentStatus: 'failed'
        };
    }

    const expectedPaystackAmount = ghanaToPesewas(order.paystack_amount || order.amount);

    if (paymentData.amount !== expectedPaystackAmount) {
        logError(`Payment amount mismatch for order ${order.reference}: expected ${expectedPaystackAmount}, got ${paymentData.amount}`);
        await Order.update(order.reference, {
            payment_status: 'failed',
            datamart_response: JSON.stringify({ error: 'Amount mismatch', expected: expectedPaystackAmount, received: paymentData.amount })
        });
        await Order.auditLog(order.reference, 'payment_status', 'pending', 'failed', 'paystack');

        const mismatchOrder = await Order.getByReference(order.reference);
        await emailService.sendAdminNotification(mismatchOrder, 'payment_failed').catch(e => {
            logError(`Failed to send admin notification: ${e.message}`);
        });
        await emailService.sendPaymentFailed(mismatchOrder).catch(e => {
            logError(`Failed to send payment failed email: ${e.message}`);
        });

        throw { status: 400, message: 'Payment amount mismatch. Please contact support.' };
    }

    await Order.update(order.reference, { payment_status: 'successful' });
    logInfo(`Payment verified successfully for order ${order.reference}`);

    const updatedOrder = await Order.getByReference(order.reference);

    let fulfillmentResult = null;
    if (order.fulfillment_status === 'pending' || order.fulfillment_status === 'processing') {
        fulfillmentResult = await fulfillOrder(updatedOrder);
    }

    const finalOrderForNotification = fulfillmentResult ? fulfillmentResult.order : updatedOrder;
    if (fulfillmentResult && fulfillmentResult.fulfillmentStatus === 'delivered') {
        await emailService.sendPaymentSuccess(finalOrderForNotification).catch(e => {
            logError(`Failed to send payment success email: ${e.message}`);
        });
    } else {
        await emailService.sendPaymentSuccess(updatedOrder).catch(e => {
            logError(`Failed to send payment success email: ${e.message}`);
        });
    }

    await Order.auditLog(order.reference, 'payment_status', 'pending', 'successful', 'paystack');
    logInfo(`Payment verified for order ${order.reference}, amount=${paymentData.amount} pesewas`);

    return {
        order: fulfillmentResult ? fulfillmentResult.order : updatedOrder,
        paymentStatus: 'successful',
        fulfillmentResult,
        fulfillmentStatus: fulfillmentResult ? fulfillmentResult.fulfillmentStatus : order.fulfillment_status,
    };
}

async function fulfillOrder(order) {
    if (order.fulfillment_status === 'delivered' || order.fulfillment_status === 'failed') {
        logInfo(`Order ${order.reference} already fulfilled with status: ${order.fulfillment_status}`);
        return {
            order,
            alreadyFulfilled: true,
            message: 'Order already fulfilled.'
        };
    }

    await Order.update(order.reference, { fulfillment_status: 'processing' });
    await Order.auditLog(order.reference, 'fulfillment_status', 'pending', 'processing', 'system');

    logInfo(`Initiating DataMart purchase for order ${order.reference}`);

    const purchaseRequest = {
        phoneNumber: order.phone_number,
        network: order.network_code,
        capacity: order.bundle_capacity_string,
        gateway: 'wallet',
        ref: `bfx-${order.reference}`
    };

    try {
        const datamartResponse = await datamartService.purchaseData(purchaseRequest);

        await Order.update(order.reference, {
            datamart_response: JSON.stringify(datamartResponse),
            datamart_purchase_id: datamartResponse.data?.purchaseId || null,
            datamart_order_reference: datamartResponse.data?.orderReference || null,
            datamart_transaction_reference: datamartResponse.data?.transactionReference || null
        });

        if (datamartResponse.status === 'success' && datamartResponse.data) {
            const datamartStatus = datamartResponse.data.orderStatus;
            const fulfillmentStatus = datamartService.mapDatamartStatusToFulfillmentStatus(datamartStatus);

            await Order.update(order.reference, {
                fulfillment_status: fulfillmentStatus
            });
            await Order.auditLog(order.reference, 'fulfillment_status', 'processing', fulfillmentStatus, 'datamart');

            const finalOrder = await Order.getByReference(order.reference);

            await sendOrderNotifications(finalOrder, fulfillmentStatus);

            logInfo(`DataMart purchase completed for order ${order.reference}: status=${datamartStatus}, fulfillment=${fulfillmentStatus}`);

            return {
                order: finalOrder,
                datamartResponse,
                fulfillmentStatus
            };
        }

        const finalOrder = await Order.getByReference(order.reference);

        if (datamartResponse.message) {
            logError(`DataMart purchase failed for order ${order.reference}: ${datamartResponse.message}`);

            await Order.update(order.reference, {
                fulfillment_status: 'failed'
            });
            await Order.auditLog(order.reference, 'fulfillment_status', 'processing', 'failed', 'datamart');

            const updatedFinalOrder = await Order.getByReference(order.reference);

            await emailService.sendStatusUpdate(updatedFinalOrder).catch(e => {
                logError(`Failed to send failure email: ${e.message}`);
            });
            await emailService.sendAdminNotification(updatedFinalOrder, 'fulfillment_failed').catch(e => {
                logError(`Failed to send admin notification: ${e.message}`);
            });

            const customerMessage = getCustomerFriendlyMessage(datamartResponse);

            return {
                order: updatedFinalOrder,
                fulfillmentStatus: 'failed',
                datamartResponse,
                customerMessage,
                error: datamartResponse.message
            };
        }

        return {
            order: finalOrder,
            fulfillmentStatus: 'pending'
        };

    } catch (err) {
        logError(`DataMart purchase exception for order ${order.reference}: ${err.message}`);
        await Order.update(order.reference, {
            fulfillment_status: 'failed',
            datamart_response: JSON.stringify({ error: err.message })
        });

        const finalOrder = await Order.getByReference(order.reference);

        await emailService.sendStatusUpdate(finalOrder).catch(e => {
            logError(`Failed to send failure email: ${e.message}`);
        });

        await emailService.sendAdminNotification(finalOrder, 'fulfillment_error').catch(e => {
            logError(`Failed to send admin notification: ${e.message}`);
        });

        return {
            order: finalOrder,
            fulfillmentStatus: 'failed',
            error: err.message,
            customerMessage: 'Your payment was received, but we could not complete the data delivery. Please keep your order reference for tracking.'
        };
    }
}

async function sendOrderNotifications(order, fulfillmentStatus) {
    if (fulfillmentStatus === 'delivered') {
        await emailService.sendDeliveryNotifications(order).catch(err => {
            logError(`Failed to send delivery notification emails: ${err.message}`);
        });
    } else if (fulfillmentStatus === 'failed') {
        await emailService.sendStatusUpdate(order).catch(err => {
            logError(`Failed to send failure email: ${err.message}`);
        });
        await emailService.sendAdminNotification(order, 'fulfillment_failed').catch(err => {
            logError(`Failed to send admin notification: ${err.message}`);
        });
    } else {
        await emailService.sendStatusUpdate(order).catch(err => {
            logError(`Failed to send status update email: ${err.message}`);
        });
    }
}

function getCustomerFriendlyMessage(datamartResponse) {
    if (datamartResponse.httpStatus === 403) {
        return 'There is a configuration issue. Please contact support.';
    }
    if (datamartResponse.code === 'INSUFFICIENT_BALANCE') {
        return 'The service provider has insufficient balance. Please try again later.';
    }
    if (datamartResponse.httpStatus === 422 || datamartResponse.httpStatus === 400) {
        return 'There was an issue with the purchase. Please try again or contact support.';
    }
    if (datamartResponse.code === 'RATE_LIMIT_EXCEEDED') {
        return 'Service is busy. Please try again in a few seconds.';
    }
    if (datamartResponse.code === 'TIMEOUT') {
        return 'The request timed out. Please check your order status in a few minutes.';
    }
    return 'Your payment was received, but we could not complete the data delivery. Please keep your order reference for tracking.';
}

async function getOrderDetails(reference) {
    let order = await Order.getByReference(reference);

    if (!order) {
        throw { status: 404, message: 'Order not found. Please check your order reference.' };
    }

    const datamartReference = order.datamart_order_reference || order.datamart_transaction_reference;
    if (datamartReference && !['delivered', 'failed'].includes(order.fulfillment_status)) {
        try {
            const datamartStatus = await datamartService.getOrderStatus(datamartReference);
            const providerStatus = datamartStatus?.data?.orderStatus;
            if (providerStatus) {
                const fulfillmentStatus = datamartService.mapDatamartStatusToFulfillmentStatus(providerStatus);
                if (fulfillmentStatus !== order.fulfillment_status) {
                    let datamartResponse = {};
                    try {
                        datamartResponse = JSON.parse(order.datamart_response || '{}');
                    } catch {
                        datamartResponse = {};
                    }

                    await Order.update(order.reference, {
                        fulfillment_status: fulfillmentStatus,
                        datamart_response: JSON.stringify({
                            ...datamartResponse,
                            latestStatusCheck: datamartStatus.data
                        })
                    });
                    await Order.auditLog(
                        order.reference,
                        'fulfillment_status',
                        order.fulfillment_status,
                        fulfillmentStatus,
                        'datamart_status_check'
                    );
                    order = await Order.getByReference(reference);
                    if (fulfillmentStatus === 'delivered') {
                        await emailService.sendDeliveryNotifications(order).catch(err => {
                            logError(`Failed to send delivery notification emails: ${err.message}`);
                        });
                    }
                }
            }
        } catch (err) {
            logError(`DataMart status refresh failed for order ${reference}: ${err.message}`);
        }
    }

    return order;
}

module.exports = {
    createOrder,
    initiatePayment,
    processPaymentVerification,
    fulfillOrder,
    getOrderDetails,
    validateOrderInput
};
