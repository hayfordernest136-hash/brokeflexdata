const axios = require('axios');
const { CHECKER_BASE_URL, HEADERS, VALID_CHECKER_TYPES } = require('../config/datamartChecker');
const { logError, logInfo, logWarn } = require('../utils/logger');

const httpClient = axios.create({
    baseURL: CHECKER_BASE_URL,
    timeout: 30000,
    headers: HEADERS
});

async function getCheckerProducts() {
    try {
        logInfo('Fetching checker products from DataMart...');
        const response = await httpClient.get('/products');

        if (response.data.status === 'success') {
            logInfo(`DataMart checker products fetched. Count: ${response.data.data?.length || 0}`);
            return response.data;
        }

        throw new Error(response.data.message || 'Failed to fetch checker products');
    } catch (err) {
        logError(`DataMart checker products fetch failed: ${err.message}`);
        if (err.response) {
            const data = err.response.data;
            let message = data.message || 'Failed to fetch checker products';
            let code = data.code || null;

            if (err.response.status === 403) {
                message = 'Access denied. Please contact support.';
            } else if (err.response.status === 503) {
                message = 'DataMart service temporarily unavailable. Please try again.';
            }

            return {
                status: 'error',
                message,
                httpStatus: err.response.status,
                code,
                data: data.data || null
            };
        }

        if (err.code === 'ECONNABORTED') {
            return {
                status: 'error',
                message: 'DataMart request timed out. Please try again.',
                code: 'TIMEOUT'
            };
        }

        throw err;
    }
}

async function validateCheckerType(checkerType) {
    return VALID_CHECKER_TYPES.includes(checkerType);
}

async function purchaseChecker(checkerType, phoneNumber, ref, skipSms = true) {
    if (!VALID_CHECKER_TYPES.includes(checkerType)) {
        throw new Error(`Invalid checker type: ${checkerType}. Valid types: ${VALID_CHECKER_TYPES.join(', ')}`);
    }

    const purchaseRequest = {
        checkerType,
        phoneNumber,
        ref,
        skipSms
    };

    try {
        logInfo(`DataMart checker purchase requested: ${checkerType}, ref=${ref}`);
        const response = await httpClient.post('/purchase', purchaseRequest);

        if (response.data.status === 'success') {
            logInfo(`DataMart checker purchase successful: ${checkerType}, ref=${ref}, purchaseId=${response.data.data?.purchaseId}`);
            return response.data;
        }

        return {
            status: 'error',
            message: response.data.message || 'Purchase failed',
            httpStatus: response.status,
            data: response.data.data || null
        };
    } catch (err) {
        logError(`DataMart checker purchase failed for ref ${ref}: ${err.message}`);
        if (err.response) {
            const status = err.response.status;
            const data = err.response.data;

            let message = data.message || 'Purchase failed';
            let code = data.code || null;

            if (status === 403) {
                message = 'Access denied. Please contact support.';
            } else if (status === 400) {
                if (code === 'INSUFFICIENT_BALANCE') {
                    message = 'DataMart wallet has insufficient balance. Please try again later.';
                }
                message = data.message || 'Invalid request parameters.';
            } else if (status === 409) {
                message = 'Request already being processed. Please check order status.';
            } else if (status === 429) {
                code = data.code || 'RATE_LIMIT_EXCEEDED';
                message = 'Rate limit exceeded. Please try again later.';
            } else if (status === 500) {
                message = 'DataMart internal error. Safe to retry.';
            } else if (status === 503) {
                message = 'DataMart service temporarily unavailable. Please try again.';
            }

            return {
                status: 'error',
                message,
                httpStatus: status,
                code,
                data: data.data || null
            };
        }

        if (err.code === 'ECONNABORTED') {
            return {
                status: 'error',
                message: 'DataMart request timed out. Please check order status in a few minutes.',
                code: 'TIMEOUT'
            };
        }

        throw err;
    }
}

async function getCheckerOrderStatus(reference) {
    try {
        logInfo(`Checking DataMart checker order status for reference: ${reference}`);
        const response = await httpClient.get(`/order-status/${encodeURIComponent(reference)}`);
        return response.data;
    } catch (err) {
        logError(`DataMart checker order status check failed for ${reference}: ${err.message}`);
        if (err.response) {
            const data = err.response.data;
            return {
                status: 'error',
                message: data.message || 'Failed to fetch order status',
                httpStatus: err.response.status,
                data: data.data || null
            };
        }
        throw err;
    }
}

async function getCheckerBalance() {
    try {
        const response = await httpClient.get('/balance');
        return response.data;
    } catch (err) {
        logError(`DataMart checker balance check failed: ${err.message}`);
        if (err.response) {
            return {
                status: 'error',
                message: err.response.data?.message || 'Failed to fetch balance',
                httpStatus: err.response.status,
                data: err.response.data?.data || null
            };
        }
        throw err;
    }
}

async function validateCheckerReference(reference) {
    try {
        const response = await httpClient.post('/validate-reference', { reference });
        return response.data;
    } catch (err) {
        logError(`DataMart validate-reference failed for ${reference}: ${err.message}`);
        if (err.response) {
            return {
                status: 'error',
                message: err.response.data?.message || 'Failed to validate reference',
                httpStatus: err.response.status,
                data: err.response.data?.data || null
            };
        }
        throw err;
    }
}

function mapDatamartStatusToFulfillmentStatus(datamartStatus) {
    const status = (datamartStatus || '').toLowerCase();

    switch (status) {
        case 'completed':
            return 'delivered';
        case 'processing':
            return 'processing';
        case 'failed':
            return 'failed';
        case 'refunded':
            return 'failed';
        case 'pending':
        case 'waiting':
        default:
            return 'pending';
    }
}

module.exports = {
    httpClient,
    getCheckerProducts,
    purchaseChecker,
    getCheckerOrderStatus,
    getCheckerBalance,
    validateCheckerReference,
    validateCheckerType,
    mapDatamartStatusToFulfillmentStatus
};
