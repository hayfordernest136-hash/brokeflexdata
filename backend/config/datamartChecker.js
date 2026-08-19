require('dotenv').config();

const CHECKER_BASE_URL = process.env.DATAMART_CHECKER_BASE_URL || 'https://api.datamartgh.shop/api/checkers';

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

const VALID_CHECKER_TYPES = ['WAEC', 'BECE'];

module.exports = {
    CHECKER_BASE_URL,
    HEADERS: headers,
    VALID_CHECKER_TYPES
};
