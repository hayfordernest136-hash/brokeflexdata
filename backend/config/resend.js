require('dotenv').config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
    console.warn('[WARNING] RESEND_API_KEY is not set in environment variables.');
}

const rawAdminEmail = process.env.ADMIN_EMAIL || 'hayfordernest136@gmail.com';
const ADMIN_EMAIL = rawAdminEmail === 'admin@brokeflexdata.com'
    ? 'hayfordernest136@gmail.com'
    : rawAdminEmail;

module.exports = {
    API_KEY: RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@brokeflexdata.com',
    ADMIN_EMAIL
};
