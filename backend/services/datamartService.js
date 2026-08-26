const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { BASE_URL, HEADERS } = require('../config/datamart');
const { logError, logInfo } = require('../utils/logger');

const httpClient = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: HEADERS
});

async function checkBalance() {
    try {
        const response = await httpClient.get('/balance');
        return response.data;
    } catch (err) {
        logError(`DataMart balance check failed: ${err.message}`);
        throw err;
    }
}

async function getDataPackages(networkCode) {
    try {
        const url = networkCode ? `/data-packages?network=${networkCode}` : '/data-packages';
        const response = await httpClient.get(url);

        if (response.data.status === 'success') {
            return response.data;
        }

        throw new Error(response.data.message || 'Failed to fetch data packages');
    } catch (err) {
        logError(`DataMart data packages fetch failed: ${err.message}`);
        throw err;
    }
}

async function verifyNumber(phoneNumber) {
    try {
        const response = await httpClient.post('/verify-number', { phoneNumber });
        return response.data;
    } catch (err) {
        logError(`DataMart verify-number failed for ${phoneNumber}: ${err.message}`);
        if (err.response) {
            return {
                status: 'error',
                data: err.response.data || { servable: true, recommendation: 'sell_any' },
                httpStatus: err.response.status
            };
        }
        throw err;
    }
}

async function purchaseData(purchaseRequest) {
    try {
        const idempotencyKey = purchaseRequest.idempotencyKey ||
            (purchaseRequest.ref ? `bfx-${purchaseRequest.ref}` : uuidv4());

        const response = await httpClient.post('/purchase', purchaseRequest, {
            headers: { 'X-Idempotency-Key': idempotencyKey }
        });

        return {
            ...response.data,
            _idempotencyKey: idempotencyKey
        };
    } catch (err) {
        logError(`DataMart purchase failed for ref ${purchaseRequest.ref}: ${err.message}`);
        if (err.response) {
            const status = err.response.status;
            const data = err.response.data;

            let message = data.message || 'Purchase failed';
            let code = data.code || null;

            if (status === 403 && code === 'API_RULE_VIOLATION') {
                message = 'Authentication configuration error. Please contact support.';
            } else if (status === 403 && code === 'API_IP_NOT_ALLOWED') {
                message = 'Access restricted. Please contact support.';
            } else if (status === 409) {
                message = 'Request already being processed. Please check order status.';
            } else if (status === 429) {
                code = data.code || 'RATE_LIMIT_EXCEEDED';
                message = 'Rate limit exceeded. Please try again.';
            } else if (status === 422) {
                message = data.message || 'Invalid request parameters.';
            } else if (status === 503) {
                message = 'DataMart service temporarily unavailable. Please try again.';
            }

            return {
                status: 'error',
                message,
                httpStatus: status,
                code,
                data: data.data || null,
                _idempotencyKey: idempotencyKey
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

async function getOrderStatus(reference) {
    try {
        const response = await httpClient.get(`/order-status/${encodeURIComponent(reference)}`);
        return response.data;
    } catch (err) {
        logError(`DataMart order status check failed for ${reference}: ${err.message}`);
        if (err.response) {
            return {
                status: 'error',
                message: err.response.data?.message || 'Failed to fetch order status',
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
    checkBalance,
    getDataPackages,
    verifyNumber,
    purchaseData,
    getOrderStatus,
    mapDatamartStatusToFulfillmentStatus,
    httpClient
};
