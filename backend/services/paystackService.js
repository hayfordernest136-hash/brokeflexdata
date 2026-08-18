const axios = require('axios');
const { BASE_URL, SECRET_KEY } = require('../config/paystack');
const { calculatePaystackFee } = require('../utils/pricing');
const { logError, logInfo } = require('../utils/logger');

const httpClient = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SECRET_KEY || ''}`
    }
});

async function initializeTransaction(payload) {
    try {
        const response = await httpClient.post('/transaction/initialize', payload);
        return response.data;
    } catch (err) {
        logError(`Paystack initialize transaction failed: ${err.message}`);
        if (err.response) {
            const error = new Error(err.response.data.message || 'Payment initialization failed');
            error.status = err.response.status;
            error.code = err.response.data.code || null;
            throw error;
        }
        if (err.code === 'ECONNABORTED') {
            const error = new Error('Payment service timed out. Please try again.');
            error.status = 504;
            error.code = 'TIMEOUT';
            throw error;
        }
        throw err;
    }
}

async function verifyTransaction(reference) {
    try {
        const response = await httpClient.get(`/transaction/verify/${encodeURIComponent(reference)}`);
        return response.data;
    } catch (err) {
        logError(`Paystack verify transaction failed for ${reference}: ${err.message}`);
        if (err.response) {
            return {
                status: false,
                message: err.response.data.message || 'Verification failed',
                data: null
            };
        }
        throw err;
    }
}

function convertGhanaToPescewas(amountGHS) {
    return Math.round(parseFloat(amountGHS) * 100);
}

function convertPesewasToGhana(amountPesewas) {
    return parseFloat(amountPesewas) / 100;
}

function calculateFee(sellingPricePesewas) {
    return calculatePaystackFee(sellingPricePesewas);
}

module.exports = {
    initializeTransaction,
    verifyTransaction,
    convertGhanaToPescewas,
    convertPesewasToGhana,
    calculateFee,
    httpClient
};
