require('dotenv').config();

const BASE_URL = process.env.DATAMART_BASE_URL || 'https://api.datamartgh.shop/api/developer';

if (!process.env.DATAMART_API_KEY) {
    console.warn('[WARNING] DATAMART_API_KEY is not set in environment variables.');
}

const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.DATAMART_API_KEY || ''
};

if (process.env.DATAMART_API_SECRET) {
    headers['X-API-Secret'] = process.env.DATAMART_API_SECRET;
}

module.exports = {
    BASE_URL,
    HEADERS: headers,
    NETWORK_CODES: {
        MTN: 'YELLO',
        TELECEL: 'TELECEL',
        AIRTEL_TIGO: 'AT_PREMIUM'
    },
    NETWORK_NAMES: {
        YELLO: 'MTN',
        TELECEL: 'Telecel',
        AT_PREMIUM: 'AirtelTigo'
    },
    NETWORK_COLORS: {
        MTN: 'yellow',
        TELECEL: 'red',
        AIRTEL_TIGO: 'blue'
    }
};
