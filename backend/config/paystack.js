require('dotenv').config();

const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
    console.warn('[WARNING] PAYSTACK_SECRET_KEY is not set in environment variables.');
}

const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY || ''}`
};

module.exports = {
    BASE_URL: PAYSTACK_BASE_URL,
    SECRET_KEY: PAYSTACK_SECRET_KEY,
    PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || '',
    HEADERS: headers,
    CURRENCY: 'GHS'
};
