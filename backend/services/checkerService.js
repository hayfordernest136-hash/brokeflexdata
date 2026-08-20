const { ResultCheckerOrder } = require('../models/ResultCheckerOrder');
const { generateReference } = require('../utils/generateReference');
const { validateGhanaPhoneNumber, validateEmail } = require('../utils/validation');
const { ghanaToPesewas, calculatePaystackFee, pesewasToGhana } = require('../utils/pricing');
const { logInfo, logError, logWarn } = require('../utils/logger');
const paystackService = require('./paystackService');
const datamartCheckerService = require('./datamartCheckerService');
const emailService = require('./emailService');

const CHECKER_MARKUP_PERCENTAGE = 15;

const CHECKER_CACHE_DURATION = 30 * 1000;
let checkerProductsCache = null;
let checkerProductsCacheTime = 0;

function calculateCheckerSellingPrice(datamartPrice) {
    const datamartCostPesewas = ghanaToPesewas(datamartPrice);
    const markupPesewas = Math.round(datamartCostPesewas * (CHECKER_MARKUP_PERCENTAGE / 100));
    const sellingPricePesewas = datamartCostPesewas + markupPesewas;
    const sellingPrice = pesewasToGhana(sellingPricePesewas);

    return {
        datamartCost: pesewasToGhana(datamartCostPesewas),
        markup: CHECKER_MARKUP_PERCENTAGE,
        sellingPrice: parseFloat(sellingPrice.toFixed(2)),
        sellingPricePesewas,
        markupAmount: pesewasToGhana(markupPesewas)
    };
}

async function getCheckerProducts() {
    const now = Date.now();
    if (checkerProductsCache && (now - checkerProductsCacheTime < CHECKER_CACHE_DURATION)) {
        return checkerProductsCache;
    }

    const productsData = await datamartCheckerService.getCheckerProducts();
    if (!productsData || productsData.status !== 'success') {
        throw new Error(productsData?.message || 'Failed to fetch checker products from provider');
    }

    const products = (productsData.data || []).filter(p => p.name === 'WAEC' || p.name === 'BECE');
    const formattedProducts = products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        sellingPrice: calculateCheckerSellingPrice(Number(p.price)).sellingPrice,
        inStock: p.inStock,
        stockCount: p.stockCount
    }));

    checkerProductsCache = formattedProducts;
    checkerProductsCacheTime = now;

    return formattedProducts;
}

async function getProductByName(products, productName) {
    return products.find(p => p.name === productName);
}

async function validateCheckerOrderInput(checkerType, phoneNumber, email) {
    if (!checkerType || !['WAEC', 'BECE'].includes(checkerType)) {
        return { valid: false, error: { status: 400, message: 'Invalid checker type. Must be WAEC or BECE.' } };
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
        phoneNumber: phoneResult.normalized,
        email: emailResult.normalized
    };
}

async function createCheckerOrder(checkerType, phoneNumber, email) {
    const validation = await validateCheckerOrderInput(checkerType, phoneNumber, email);
    if (!validation.valid) {
        throw validation.error;
    }

    const products = await getCheckerProducts();
    const product = await getProductByName(products, checkerType);

    if (!product) {
        throw { status: 400, message: 'Selected checker type is not available.' };
    }

    if (!product.inStock || product.stockCount === 0) {
        throw { status: 400, message: 'The selected checker is currently out of stock. Please try again later.' };
    }

    const datamartCost = Number(product.price);
    const pricing = calculateCheckerSellingPrice(datamartCost);
    const paystackCalc = calculatePaystackFee(pricing.sellingPricePesewas);

    const reference = generateReference();
    const paymentReference = generateReference('ps');

    const order = await ResultCheckerOrder.create({
        reference,
        checker_type: checkerType,
        phone_number: validation.phoneNumber,
        email: validation.email,
        datamart_cost: pricing.datamartCost,
        markup_percentage: pricing.markup,
        selling_price: pricing.sellingPrice,
        amount: pricing.sellingPrice,
        amount_pesewas: pricing.sellingPricePesewas,
        paystack_fee: paystackCalc.paystackFee,
        paystack_amount: paystackCalc.paystackAmount,
        payment_reference: paymentReference,
        datamart_response: null
    });

    logInfo(`Checker order created: ${reference} for ${checkerType}`);
    logInfo(`  DataMart cost: ${pricing.datamartCost} GHS`);
    logInfo(`  Selling price: ${pricing.sellingPrice} GHS (${pricing.markup}% markup)`);
    logInfo(`  Paystack amount: ${paystackCalc.paystackAmount} GHS (fee: ${paystackCalc.paystackFee} GHS)`);

    return order;
}

async function initiateCheckerPayment(order) {
    const paystackPayload = {
        email: order.email,
        amount: ghanaToPesewas(order.paystack_amount || order.amount),
        currency: 'GHS',
        reference: order.payment_reference,
        callback_url: `${process.env.FRONTEND_URL}/checkers/checkout?callback_ref=${order.reference}`
    };

    const paystackResponse = await paystackService.initializeTransaction(paystackPayload);

    if (paystackResponse.status && paystackResponse.data) {
        logInfo(`Paystack transaction initialized for checker order ${order.reference}, paystack ref: ${paystackResponse.data.reference}`);
        return {
            authorizationUrl: paystackResponse.data.authorization_url,
            reference: paystackResponse.data.reference
        };
    }

    throw new Error(paystackResponse.message || 'Failed to initialize payment');
}

async function processCheckerPaymentVerification(paystackReference) {
    const order = await ResultCheckerOrder.getByPaymentReference(paystackReference);

    if (!order) {
        throw { status: 404, message: 'Checker order not found for this payment reference.' };
    }

    if (order.payment_status === 'successful') {
        logInfo(`Payment already verified for checker order ${order.reference}`);
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
        await ResultCheckerOrder.update(order.reference, { payment_status: 'failed' });
        await ResultCheckerOrder.auditLog(order.reference, 'payment_status', 'pending', 'failed', 'paystack');
        logWarn(`Payment failed for checker order ${order.reference}: status=${paymentData.status}`);

        const failedOrder = await ResultCheckerOrder.getByReference(order.reference);
        await emailService.sendCheckerAdminNotification(failedOrder, 'checker_payment_failed').catch(e => {
            logError(`Failed to send checker admin notification: ${e.message}`);
        });

        return {
            order: failedOrder,
            paymentStatus: 'failed'
        };
    }

    const expectedPaystackAmount = ghanaToPesewas(order.paystack_amount || order.amount);
    if (paymentData.amount !== expectedPaystackAmount) {
        logError(`Payment amount mismatch for checker order ${order.reference}: expected ${expectedPaystackAmount}, got ${paymentData.amount}`);
        await ResultCheckerOrder.update(order.reference, {
            payment_status: 'failed',
            datamart_response: JSON.stringify({ error: 'Amount mismatch', expected: expectedPaystackAmount, received: paymentData.amount })
        });
        await ResultCheckerOrder.auditLog(order.reference, 'payment_status', 'pending', 'failed', 'paystack');

        const mismatchOrder = await ResultCheckerOrder.getByReference(order.reference);
        await emailService.sendCheckerAdminNotification(mismatchOrder, 'checker_payment_mismatch').catch(e => {
            logError(`Failed to send checker admin notification: ${e.message}`);
        });

        throw { status: 400, message: 'Payment amount mismatch. Please contact support.' };
    }

    await ResultCheckerOrder.update(order.reference, { payment_status: 'successful' });
    logInfo(`Payment verified successfully for checker order ${order.reference}`);

    const updatedOrder = await ResultCheckerOrder.getByReference(order.reference);

    let fulfillmentResult = null;
    if (order.fulfillment_status === 'pending' || order.fulfillment_status === 'processing') {
        fulfillmentResult = await fulfillCheckerOrder(updatedOrder);
    }

    if (fulfillmentResult && fulfillmentResult.fulfillmentStatus === 'delivered') {
        await emailService.sendCheckerResultEmail(fulfillmentResult.order).catch(e => {
            logError(`Failed to send checker result email: ${e.message}`);
        });
    }

    await ResultCheckerOrder.auditLog(order.reference, 'payment_status', 'pending', 'successful', 'paystack');
    logInfo(`Payment verified for checker order ${order.reference}, amount=${paymentData.amount} pesewas`);

    return {
        order: fulfillmentResult ? fulfillmentResult.order : updatedOrder,
        paymentStatus: 'successful',
        fulfillmentResult,
        fulfillmentStatus: fulfillmentResult ? fulfillmentResult.fulfillmentStatus : order.fulfillment_status
    };
}

async function fulfillCheckerOrder(order) {
    if (order.fulfillment_status === 'delivered' || order.fulfillment_status === 'failed') {
        logInfo(`Checker order ${order.reference} already fulfilled with status: ${order.fulfillment_status}`);
        return {
            order,
            alreadyFulfilled: true,
            message: 'Order already fulfilled.'
        };
    }

    if (order.payment_status !== 'successful') {
        logInfo(`Cannot fulfill checker order ${order.reference}: payment status is ${order.payment_status}`);
        return {
            order,
            fulfillmentStatus: order.fulfillment_status
        };
    }

    const existingDatamartRef = order.datamart_reference;
    if (existingDatamartRef) {
        logInfo(`Checker order ${order.reference} has existing DataMart reference: ${existingDatamartRef}. Checking status first.`);
        try {
            const statusResult = await datamartCheckerService.getCheckerOrderStatus(existingDatamartRef);

            if (statusResult.status === 'success' && statusResult.data?.orderStatus === 'completed') {
                const datamartData = statusResult.data;
                await ResultCheckerOrder.update(order.reference, {
                    fulfillment_status: 'delivered',
                    serial_number: datamartData.serialNumber || order.serial_number,
                    pin: datamartData.pin || order.pin,
                    datamart_purchase_id: datamartData.purchaseId || order.datamart_purchase_id,
                    datamart_transaction_id: datamartData.transactionId || order.datamart_transaction_id,
                    datamart_response: JSON.stringify({ ...JSON.parse(order.datamart_response || '{}'), latestStatusCheck: statusResult.data })
                });
                await ResultCheckerOrder.auditLog(order.reference, 'fulfillment_status', order.fulfillment_status, 'delivered', 'datamart');

                const finalOrder = await ResultCheckerOrder.getByReference(order.reference);
                return { order: finalOrder, fulfillmentStatus: 'delivered', alreadyFulfilled: true };
            }

            if (statusResult.status === 'error') {
                logWarn(`DataMart status check failed for checker order ${order.reference}: ${statusResult.message}. Will attempt purchase.`);
            }
        } catch (e) {
            logWarn(`DataMart status check failed for checker order ${order.reference}: ${e.message}. Will attempt purchase.`);
        }
    }

    await ResultCheckerOrder.update(order.reference, { fulfillment_status: 'processing' });
    await ResultCheckerOrder.auditLog(order.reference, 'fulfillment_status', order.fulfillment_status, 'processing', 'system');

    logInfo(`Initiating DataMart checker purchase for order ${order.reference}`);

    const purchaseRef = `bfx-chk-${order.reference}`;

    let datamartResponse;
    try {
        datamartResponse = await datamartCheckerService.purchaseChecker(
            order.checker_type,
            order.phone_number,
            purchaseRef,
            true
        );

        await ResultCheckerOrder.update(order.reference, {
            datamart_response: JSON.stringify(datamartResponse),
            datamart_reference: datamartResponse.data?.reference || null,
            datamart_purchase_id: datamartResponse.data?.purchaseId || null,
            datamart_transaction_id: datamartResponse.data?.transactionId || null
        });

        if (datamartResponse.status === 'success' && datamartResponse.data) {
            const datamartData = datamartResponse.data;

            await ResultCheckerOrder.update(order.reference, {
                fulfillment_status: 'delivered',
                serial_number: datamartData.serialNumber || null,
                pin: datamartData.pin || null,
                datamart_reference: datamartData.reference || order.datamart_reference,
                datamart_purchase_id: datamartData.purchaseId || order.datamart_purchase_id,
                datamart_transaction_id: datamartData.transactionId || order.datamart_transaction_id
            });
            await ResultCheckerOrder.auditLog(order.reference, 'fulfillment_status', 'processing', 'delivered', 'datamart');

            const finalOrder = await ResultCheckerOrder.getByReference(order.reference);
            logInfo(`DataMart checker purchase completed for order ${order.reference}: purchaseId=${datamartData.purchaseId}`);

            return {
                order: finalOrder,
                datamartResponse,
                fulfillmentStatus: 'delivered'
            };
        }

        const finalOrder = await ResultCheckerOrder.getByReference(order.reference);

        if (datamartResponse.message) {
            logError(`DataMart checker purchase failed for order ${order.reference}: ${datamartResponse.message}`);

            const isInsufficientBalance = datamartResponse.code === 'INSUFFICIENT_BALANCE';
            const isRateLimited = datamartResponse.code === 'RATE_LIMIT_EXCEEDED' || datamartResponse.httpStatus === 429;
            const isServerError = datamartResponse.httpStatus === 500;

            if (isInsufficientBalance || isRateLimited || isServerError) {
                await ResultCheckerOrder.update(order.reference, {
                    fulfillment_status: 'fulfillment_pending'
                });
                await ResultCheckerOrder.auditLog(order.reference, 'fulfillment_status', 'processing', 'fulfillment_pending', 'datamart');
            } else {
                await ResultCheckerOrder.update(order.reference, {
                    fulfillment_status: 'failed'
                });
                await ResultCheckerOrder.auditLog(order.reference, 'fulfillment_status', 'processing', 'failed', 'datamart');
            }

            await emailService.sendCheckerAdminNotification(finalOrder, 'checker_fulfillment_failed').catch(e => {
                logError(`Failed to send checker admin notification: ${e.message}`);
            });

            return {
                order: finalOrder,
                fulfillmentStatus: finalOrder.fulfillment_status,
                datamartResponse,
                error: datamartResponse.message,
                customerMessage: getCheckerCustomerFriendlyMessage(datamartResponse)
            };
        }

        return {
            order: finalOrder,
            fulfillmentStatus: 'pending'
        };

    } catch (err) {
        logError(`DataMart checker purchase exception for order ${order.reference}: ${err.message}`);
        await ResultCheckerOrder.update(order.reference, {
            fulfillment_status: 'fulfillment_pending',
            datamart_response: JSON.stringify({ error: err.message })
        });
        await ResultCheckerOrder.auditLog(order.reference, 'fulfillment_status', 'processing', 'fulfillment_pending', 'datamart');

        const finalOrder = await ResultCheckerOrder.getByReference(order.reference);
        await emailService.sendCheckerAdminNotification(finalOrder, 'checker_fulfillment_error').catch(e => {
            logError(`Failed to send checker admin notification: ${e.message}`);
        });

        return {
            order: finalOrder,
            fulfillmentStatus: 'fulfillment_pending',
            error: err.message,
            customerMessage: 'Your payment was received, but we could not complete the checker purchase. Please keep your order reference for tracking.'
        };
    }
}

function getCheckerCustomerFriendlyMessage(datamartResponse) {
    if (datamartResponse.httpStatus === 403) {
        return 'There is a configuration issue. Please contact support.';
    }
    if (datamartResponse.code === 'INSUFFICIENT_BALANCE') {
        return 'The service provider has insufficient balance. Please try again later.';
    }
    if (datamartResponse.httpStatus === 429) {
        return 'Service is busy. Please try again in a few seconds.';
    }
    if (datamartResponse.code === 'TIMEOUT') {
        return 'The request timed out. Please check your order status in a few minutes.';
    }
    if (datamartResponse.httpStatus === 500) {
        return 'We are checking your order status. Please check back in a few minutes.';
    }
    return 'Your payment was received, but we could not complete the checker purchase. Please keep your order reference for tracking.';
}

async function checkResultCheckerStatus(orderReference) {
    const order = await ResultCheckerOrder.getByReference(orderReference);

    if (!order) {
        throw { status: 404, message: 'Checker order not found.' };
    }

    const datamartReference = order.datamart_reference;
    if (!datamartReference) {
        return {
            status: 'error',
            message: 'No DataMart reference found for this order. Purchase has not been initiated.',
            data: null
        };
    }

    const datamartStatus = await datamartCheckerService.getCheckerOrderStatus(datamartReference);

    if (datamartStatus.status === 'success' && datamartStatus.data?.orderStatus === 'completed') {
        const datamartData = datamartStatus.data;

        if (order.fulfillment_status !== 'delivered') {
            await ResultCheckerOrder.update(order.reference, {
                fulfillment_status: 'delivered',
                serial_number: datamartData.serialNumber || order.serial_number,
                pin: datamartData.pin || order.pin,
                datamart_purchase_id: datamartData.purchaseId || order.datamart_purchase_id,
                datamart_transaction_id: datamartData.transactionId || order.datamart_transaction_id,
                datamart_response: JSON.stringify({
                    ...JSON.parse(order.datamart_response || '{}'),
                    latestStatusCheck: datamartData
                })
            });
            await ResultCheckerOrder.auditLog(order.reference, 'fulfillment_status', order.fulfillment_status, 'delivered', 'datamart_status_check');
            logInfo(`Checker order ${order.reference} marked as delivered after status check.`);
        }
    }

    return datamartStatus;
}

async function getCheckerOrderDetails(reference) {
    const order = await ResultCheckerOrder.getByReference(reference);

    if (!order) {
        throw { status: 404, message: 'Result checker order not found. Please check your order reference.' };
    }

    return order;
}

async function getCheckerBalance() {
    return datamartCheckerService.getCheckerBalance();
}

async function retryCheckerFulfillment(orderRef) {
    const order = await ResultCheckerOrder.getByReference(orderRef);

    if (!order) {
        throw { status: 404, message: 'Checker order not found.' };
    }

    if (order.payment_status !== 'successful') {
        throw { status: 400, message: 'Cannot retry fulfillment. Payment was not successful.' };
    }

    if (order.fulfillment_status !== 'failed' && order.fulfillment_status !== 'pending' && order.fulfillment_status !== 'fulfillment_pending') {
        throw { status: 400, message: `Cannot retry fulfillment. Current status is '${order.fulfillment_status}'.` };
    }

    if (order.fulfillment_status === 'delivered') {
        throw { status: 400, message: 'Order has already been successfully fulfilled.' };
    }

    const result = await fulfillCheckerOrder({
        ...order,
        fulfillment_status: 'pending'
    });

    return {
        order: result.order,
        fulfillmentStatus: result.fulfillmentStatus
    };
}

module.exports = {
    calculateCheckerSellingPrice,
    getCheckerProducts,
    createCheckerOrder,
    initiateCheckerPayment,
    processCheckerPaymentVerification,
    fulfillCheckerOrder,
    checkResultCheckerStatus,
    getCheckerOrderDetails,
    getCheckerBalance,
    retryCheckerFulfillment,
    CHECKER_MARKUP_PERCENTAGE
};
