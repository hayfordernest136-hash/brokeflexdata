const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { adminAuth } = require('../config/admin');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/adminAuthController');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { status: 'error', message: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/auth/login', loginLimiter, authController.login);

router.get('/dashboard', adminAuth, adminController.getDashboard);
router.get('/orders', adminAuth, adminController.getOrders);
router.get('/orders/:id', adminAuth, adminController.getOrder);
router.get('/orders/:id/audits', adminAuth, adminController.getOrderAudits);
router.get('/orders/:id/payments/verify', adminAuth, adminController.verifyPaymentAdmin);
router.post('/orders/:id/check-datamart', adminAuth, adminController.checkDatamartStatus);
router.post('/orders/:id/retry-fulfillment', adminAuth, adminController.retryFulfillment);

router.get('/bundles', adminAuth, adminController.getBundles);
router.post('/bundles/refresh', adminAuth, adminController.refreshBundles);

router.get('/customers', adminAuth, adminController.getCustomers);

router.get('/payments', adminAuth, adminController.getPayments);

router.get('/emails', adminAuth, adminController.getEmails);
router.post('/emails/test', adminAuth, adminController.sendTestEmail);

router.get('/settings', adminAuth, adminController.getSettings);
router.get('/audit-logs', adminAuth, adminController.getAuditLogs);

router.get('/checkers/stats', adminAuth, adminController.getCheckerDashboardStats);
router.get('/checkers/products', adminAuth, adminController.getCheckerProductsAdmin);
router.get('/checkers', adminAuth, adminController.getCheckerOrders);
router.get('/checkers/:id', adminAuth, adminController.getCheckerOrder);
router.get('/checkers/:id/payments/verify', adminAuth, adminController.verifyCheckerPaymentAdmin);
router.post('/checkers/:id/check-datamart', adminAuth, adminController.checkCheckerDatamartStatus);
router.post('/checkers/:id/retry-fulfillment', adminAuth, adminController.retryCheckerFulfillment);

module.exports = router;
