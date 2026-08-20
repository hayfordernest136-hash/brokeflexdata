const { Order } = require('../models/Order');
const { ResultCheckerOrder } = require('../models/ResultCheckerOrder');
const emailService = require('../services/emailService');
const datamartService = require('../services/datamartService');
const checkerService = require('../services/checkerService');
const datamartCheckerService = require('../services/datamartCheckerService');
const { PAYSTACK_BASE_URL, PAYSTACK_SECRET_KEY } = require('../config/paystack');
const { EMAIL_FROM, ADMIN_EMAIL } = require('../config/resend');
const { logInfo, logError } = require('../utils/logger');

function maskApiKey(key) {
    if (!key || key.length < 4) return '••••••••••';
    return `••••••••${key.slice(-4)}`;
}

function maskEmail(email) {
    if (!email) return '—';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
}

function formatOrderResponse(order) {
    return {
        id: order.id,
        reference: order.reference,
        network: order.network,
        networkCode: order.network_code,
        bundleCapacity: order.bundle_capacity,
        bundleCapacityString: order.bundle_capacity_string,
        bundlePrice: order.bundle_price,
        sellingPrice: order.selling_price,
        datamartCost: order.datamart_cost,
        markupPercentage: order.markup_percentage,
        paystackFee: order.paystack_fee,
        paystackAmount: order.paystack_amount,
        phoneNumber: order.phone_number,
        email: order.email,
        contactNumber: order.contact_number,
        amount: order.amount,
        amountPesewas: order.amount_pesewas,
        paymentReference: order.payment_reference,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        datamartPurchaseId: order.datamart_purchase_id,
        datamartOrderReference: order.datamart_order_reference,
        datamartTransactionReference: order.datamart_transaction_reference,
        datamartResponse: order.datamart_response,
        createdAt: order.created_at,
        updatedAt: order.updated_at
    };
}

async function getDashboard(req, res) {
    try {
        const stats = await Order.getDashboardStats();

        let datamartStatus = { connected: false, message: 'Not checked yet' };
        try {
            const balance = await datamartService.checkBalance();
            datamartStatus = {
                connected: balance && balance.status === 'success',
                balance: balance?.data?.balance || null,
                message: balance?.status === 'success' ? 'Connected' : 'Error',
            };
            logInfo(`Admin dashboard: DataMart balance check status=${balance?.status}`);
        } catch (err) {
            datamartStatus = {
                connected: false,
                message: 'Unavailable',
                error: err.message,
            };
        }

        let emailStatus = {
            configured: !!process.env.RESEND_API_KEY,
            from: EMAIL_FROM,
            adminEmail: ADMIN_EMAIL,
        };

        const recentOrders = await Order.getRecentOrders(10);

        await Order.recordAuditLog(
            req.admin.email,
            'dashboard_viewed',
            null,
            null
        );

        res.json({
            status: 'success',
            data: {
                stats,
                datamartStatus,
                emailStatus,
                recentOrders: recentOrders.map(formatOrderResponse),
            }
        });
    } catch (err) {
        logError(`Admin dashboard error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch dashboard.' });
    }
}

async function getOrders(req, res) {
    try {
        const {
            search = '',
            network = '',
            paymentStatus = '',
            fulfillmentStatus = '',
            page = '1',
            limit = '50',
            sortBy = 'created_at',
            sortDir = 'desc'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const queryLimit = parseInt(limit);

        const orders = await Order.search({
            search,
            network: network || undefined,
            paymentStatus: paymentStatus || undefined,
            fulfillmentStatus: fulfillmentStatus || undefined,
            offset,
            limit: queryLimit,
        });

        const countParams = {};
        if (network) countParams.network = network;
        if (paymentStatus) countParams.paymentStatus = paymentStatus;
        if (fulfillmentStatus) countParams.fulfillmentStatus = fulfillmentStatus;
        if (search) {
            countParams.network = network || undefined;
            countParams.paymentStatus = paymentStatus || undefined;
            countParams.fulfillmentStatus = fulfillmentStatus || undefined;
        }

        const totalCount = await Order.count(search ? { ...countParams, search } : countParams);
        const totalPages = Math.ceil(totalCount / queryLimit);

        await Order.recordAuditLog(
            req.admin.email,
            'orders_viewed',
            null,
            `page=${page}&limit=${limit}&search=${search || 'none'}`
        );

        res.json({
            status: 'success',
            data: {
                orders: orders.map(formatOrderResponse),
                pagination: {
                    page: parseInt(page),
                    limit: queryLimit,
                    total: totalCount,
                    totalPages,
                }
            }
        });
    } catch (err) {
        logError(`Admin getOrders error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch orders.' });
    }
}

async function getOrder(req, res) {
    try {
        const { id } = req.params;
        let order;

        if (id.match(/^[0-9]+$/)) {
            order = await Order.getById(id);
        } else {
            order = await Order.getByReference(id);
        }

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        const auditTrail = await Order.getAuditTrail(order.reference);

        await Order.recordAuditLog(
            req.admin.email,
            'order_viewed',
            order.reference,
            null
        );

        res.json({
            status: 'success',
            data: {
                ...formatOrderResponse(order),
                auditTrail: auditTrail,
            }
        });
    } catch (err) {
        logError(`Admin getOrder error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch order.' });
    }
}

async function getOrderAudits(req, res) {
    try {
        const { id } = req.params;
        let order;

        if (id.match(/^[0-9]+$/)) {
            order = await Order.getById(id);
        } else {
            order = await Order.getByReference(id);
        }

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        const audits = await Order.getAuditTrail(order.reference);

        await Order.recordAuditLog(req.admin.email, 'order_audits_viewed', order.reference, null);

        res.json({
            status: 'success',
            data: audits,
        });
    } catch (err) {
        logError(`Admin getOrderAudits error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch audit logs.' });
    }
}

async function checkDatamartStatus(req, res) {
    try {
        const { id } = req.params;
        let order;

        if (id.match(/^[0-9]+$/)) {
            order = await Order.getById(id);
        } else {
            order = await Order.getByReference(id);
        }

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        const hasDatamartRef = order.datamart_order_reference || order.datamart_transaction_reference;
        if (!hasDatamartRef) {
            return res.json({
                status: 'success',
                data: {
                    message: 'No DataMart transaction reference found for this order.',
                    order: formatOrderResponse(order),
                }
            });
        }

        let datamartStatus = null;
        try {
            datamartStatus = await datamartService.getOrderStatus(
                order.datamart_order_reference || order.datamart_transaction_reference
            );
        } catch (err) {
            logError(`DataMart status check failed for order ${order.reference}: ${err.message}`);
        }

        const updatedResponse = datamartStatus?.status === 'success' && datamartStatus?.data?.orderStatus
            ? datamartStatus.data.orderStatus
            : null;

        if (datamartStatus && datamartStatus.data?.orderStatus) {
            const newFulfillmentStatus = datamartService.mapDatamartStatusToFulfillmentStatus(
                datamartStatus.data.orderStatus
            );

            if (newFulfillmentStatus !== order.fulfillment_status) {
                await Order.update(order.reference, {
                    fulfillment_status: newFulfillmentStatus,
                    datamart_response: JSON.stringify({
                        ...JSON.parse(order.datamart_response || '{}'),
                        latestStatusCheck: datamartStatus.data
                    })
                });
                await Order.auditLog(
                    order.reference,
                    'fulfillment_status',
                    order.fulfillment_status,
                    newFulfillmentStatus,
                    'admin_manual_check'
                );

                const updatedOrder = await Order.getByReference(order.reference);
                if (newFulfillmentStatus === 'delivered') {
                    await emailService.sendDeliveryNotifications(updatedOrder).catch(err => {
                        logError(`Failed to send delivery notification emails: ${err.message}`);
                    });
                } else {
                    await emailService.sendStatusUpdate(updatedOrder).catch(err => {
                        logError(`Failed to send status update after DataMart check: ${err.message}`);
                    });
                }

                order.fulfillment_status = newFulfillmentStatus;
            }
        }

        await Order.recordAuditLog(
            req.admin.email,
            'datamart_status_checked',
            order.reference,
            `datamartStatus=${datamartStatus?.status || 'error'}`
        );

        res.json({
            status: 'success',
            data: {
                datamartStatus,
                order: formatOrderResponse(order),
            }
        });
    } catch (err) {
        logError(`Admin checkDatamartStatus error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to check DataMart status.' });
    }
}

async function retryFulfillment(req, res) {
    try {
        const { id } = req.params;
        let order;

        if (id.match(/^[0-9]+$/)) {
            order = await Order.getById(id);
        } else {
            order = await Order.getByReference(id);
        }

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        if (order.payment_status !== 'successful') {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot retry fulfillment. Payment was not successful.',
                paymentStatus: order.payment_status,
            });
        }

        if (order.fulfillment_status !== 'failed' && order.fulfillment_status !== 'pending') {
            return res.status(400).json({
                status: 'error',
                message: `Cannot retry fulfillment. Current status is '${order.fulfillment_status}'.`,
                fulfillmentStatus: order.fulfillment_status,
            });
        }

        if (order.fulfillment_status === 'delivered') {
            return res.status(400).json({
                status: 'error',
                message: 'Order has already been successfully fulfilled.',
            });
        }

        await Order.update(order.reference, {
            fulfillment_status: 'processing'
        });
        await Order.auditLog(
            order.reference,
            'fulfillment_status',
            order.fulfillment_status,
            'processing',
            'admin_retry'
        );

        const orderService = require('../services/orderService');
        const result = await orderService.fulfillOrder({
            ...order,
            fulfillment_status: 'processing'
        });

        await Order.recordAuditLog(
            req.admin.email,
            'fulfillment_retried',
            order.reference,
            `result=${result.fulfillmentStatus}`
        );

        const updatedOrder = await Order.getByReference(order.reference);
        res.json({
            status: 'success',
            data: {
                message: 'Fulfillment retry initiated.',
                order: formatOrderResponse(updatedOrder),
                fulfillmentStatus: result.fulfillmentStatus,
            }
        });
    } catch (err) {
        logError(`Admin retryFulfillment error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to retry fulfillment.' });
    }
}

async function getBundles(req, res) {
    try {
        const packages = await datamartService.getDataPackages();

        await Order.recordAuditLog(
            req.admin.email,
            'bundles_viewed',
            null,
            null
        );

        res.json({
            status: 'success',
            data: {
                networks: packages.data || {},
                lastUpdated: new Date().toISOString(),
                fromCache: false,
            }
        });
    } catch (err) {
        logError(`Admin getBundles error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch bundles.' });
    }
}

async function refreshBundles(req, res) {
    try {
        const packages = await datamartService.getDataPackages();

        await Order.recordAuditLog(
            req.admin.email,
            'bundles_refreshed',
            null,
            null
        );

        res.json({
            status: 'success',
            data: {
                networks: packages.data || {},
                lastUpdated: new Date().toISOString(),
            }
        });
    } catch (err) {
        logError(`Admin refreshBundles error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to refresh bundles.' });
    }
}

async function verifyPaymentAdmin(req, res) {
    try {
        const { reference } = req.params;
        const order = await Order.getByReference(reference);

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        if (!order.payment_reference) {
            return res.status(400).json({
                status: 'error',
                message: 'No payment reference found for this order.',
            });
        }

        const axios = require('axios');
        const verifyResponse = await axios.get(
            `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(order.payment_reference)}`,
            {
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
            }
        );

        const paymentData = verifyResponse.data.data;

        await Order.recordAuditLog(
            req.admin.email,
            'payment_verified_manually',
            order.reference,
            `paystackStatus=${paymentData.status}`
        );

        res.json({
            status: 'success',
            data: {
                paymentReference: order.payment_reference,
                paystackReference: paymentData.reference,
                amount: paymentData.amount,
                currency: paymentData.currency,
                status: paymentData.status,
                paidAt: paymentData.paid_at,
                channel: paymentData.channel,
            }
        });
    } catch (err) {
        logError(`Admin verifyPayment error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to verify payment.' });
    }
}

async function verifyCheckerPaymentAdmin(req, res) {
    try {
        const { id } = req.params;
        let order;

        if (id.match(/^[0-9]+$/)) {
            order = await ResultCheckerOrder.getById(id);
        } else {
            order = await ResultCheckerOrder.getByReference(id);
        }

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Checker order not found.' });
        }

        if (!order.payment_reference) {
            return res.status(400).json({
                status: 'error',
                message: 'No payment reference found for this order.',
            });
        }

        const axios = require('axios');
        const verifyResponse = await axios.get(
            `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(order.payment_reference)}`,
            {
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
            }
        );

        const paymentData = verifyResponse.data.data;

        await Order.recordAuditLog(
            req.admin.email,
            'checker_payment_verified_manually',
            order.reference,
            `paystackStatus=${paymentData.status}`
        );

        if (paymentData.status === 'success') {
            await ResultCheckerOrder.update(order.reference, { payment_status: 'successful' });
        }

        res.json({
            status: 'success',
            data: {
                paymentReference: order.payment_reference,
                paystackReference: paymentData.reference,
                amount: paymentData.amount,
                currency: paymentData.currency,
                status: paymentData.status,
                paidAt: paymentData.paid_at,
                channel: paymentData.channel,
            }
        });
    } catch (err) {
        logError(`Admin verifyCheckerPayment error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to verify payment.' });
    }
}

async function getCustomers(req, res) {
    try {
        const { search = '', page = '1', limit = '50' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let customers;
        let totalCount;

        if (search) {
            const term = `%${search}%`;
            customers = await Order.search({
                search,
                offset,
                limit: parseInt(limit),
            });

            totalCount = await Order.count({ search });
        } else {
            const rows = await Order.search({
                offset,
                limit: parseInt(limit),
            });

            const seen = new Map();
            for (const row of rows) {
                const key = `${row.email}|${row.phone_number}`;
                if (!seen.has(key)) {
                    seen.set(key, {
                        email: row.email,
                        phoneNumber: row.phone_number,
                        contactNumber: row.contact_number,
                        firstOrder: row.created_at,
                        orderCount: 1,
                        lastOrder: row.created_at,
                        networks: new Set([row.network]),
                    });
                } else {
                    const existing = seen.get(key);
                    existing.orderCount += 1;
                    if (row.created_at > existing.lastOrder) existing.lastOrder = row.created_at;
                    if (row.created_at < existing.firstOrder) existing.firstOrder = row.created_at;
                    existing.networks.add(row.network);
                }
            }

            customers = Array.from(seen.values()).map(c => ({
                ...c,
                networks: Array.from(c.networks),
            }));

            totalCount = customers.length;
        }

        const totalOrders = await Order.count({});
        totalCount = search ? totalCount : totalOrders;

        await Order.recordAuditLog(
            req.admin.email,
            'customers_viewed',
            null,
            search ? `search=${search}` : null
        );

        res.json({
            status: 'success',
            data: {
                customers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                }
            }
        });
    } catch (err) {
        logError(`Admin getCustomers error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch customers.' });
    }
}

async function getPayments(req, res) {
    try {
        const { search = '', page = '1', limit = '50' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const orders = await Order.search({
            search,
            offset,
            limit: parseInt(limit),
        });

        const payments = orders
            .filter(o => o.payment_reference)
            .map(o => ({
                id: o.id,
                orderReference: o.reference,
                paymentReference: o.payment_reference,
                amount: o.paystack_amount || o.amount,
                paystackFee: o.paystack_fee,
                currency: 'GHS',
                paymentStatus: o.payment_status,
                customerEmail: o.email,
                network: o.network,
                bundle: `${o.bundle_capacity_string}GB`,
                createdAt: o.created_at,
                updatedAt: o.updated_at,
            }));

        const totalCount = payments.length;

        await Order.recordAuditLog(
            req.admin.email,
            'payments_viewed',
            null,
            search ? `search=${search}` : null
        );

        res.json({
            status: 'success',
            data: {
                payments,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                }
            }
        });
    } catch (err) {
        logError(`Admin getPayments error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch payments.' });
    }
}

async function getEmails(req, res) {
    try {
        const { status = '', page = '1', limit = '50' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const events = await Order.getEmailEvents(parseInt(limit), offset);

        const filtered = status
            ? events.filter(e => e.status === status)
            : events;

        const totalCount = await Order.countEmailEvents(status || undefined);

        await Order.recordAuditLog(
            req.admin.email,
            'emails_viewed',
            null,
            status ? `status=${status}` : null
        );

        res.json({
            status: 'success',
            data: {
                emails: filtered.map(e => ({
                    id: e.id,
                    orderReference: e.order_reference,
                    recipientEmail: e.recipient_email,
                    emailType: e.email_type,
                    status: e.status,
                    resendId: e.resend_id,
                    error: e.error,
                    sentAt: e.sent_at,
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                }
            }
        });
    } catch (err) {
        logError(`Admin getEmails error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch emails.' });
    }
}

async function sendTestEmail(req, res) {
    try {
        const { email, subject } = req.body;

        if (!email) {
            return res.status(400).json({ status: 'error', message: 'Email address is required.' });
        }

        const emailContent = emailService.buildOrderConfirmationEmail({
            reference: 'TEST-EMAIL',
            network: 'MTN',
            bundle_capacity_string: '1',
            amount: 0.01,
            phone_number: '0240000000',
            email: 'test@brokeflexdata.com',
            payment_status: 'successful',
            fulfillment_status: 'delivered',
            datamart_cost: 0.01,
            selling_price: 0.01,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        const htmlContent = `
            <html>
            <head><meta charset="utf-8"><title>${subject || 'Brokeflex Email Test'}</title></head>
            <body style="font-family: 'Inter', sans-serif; background: #f9fafb; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px;">
                <h2 style="color: #1e293b;">Brokeflex Data Email Test</h2>
                <p>This is a test email from the Brokeflex Data Admin Panel.</p>
                <p>If you received this, your Resend email configuration is working correctly.</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">Sent at ${new Date().toISOString()}</p>
              </div>
            </body>
            </html>
        `;

        const result = await emailService.sendTestEmail(email, subject || 'Brokeflex Email Test', htmlContent);

        if (result.error) {
            await Order.recordAuditLog(req.admin.email, 'email_test_sent', null, `status=failed&error=${result.error}`);
            return res.status(400).json({
                status: 'error',
                message: result.error,
            });
        }

        await Order.recordAuditLog(req.admin.email, 'email_test_sent', null, `status=success&to=${email}&id=${result.id}`);
        res.json({
            status: 'success',
            data: {
                message: 'Email sent successfully.',
                emailId: result.id,
                recipient: email,
            }
        });
    } catch (err) {
        logError(`Admin sendTestEmail error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to send test email.' });
    }
}

async function getSettings(req, res) {
    try {
        let datamartStatus = { connected: false, message: 'Not configured', lastCheck: null };
        try {
            const balance = await datamartService.checkBalance();
            datamartStatus = {
                connected: balance && balance.status === 'success',
                balance: balance?.data?.balance || null,
                lastCheck: new Date().toISOString(),
                message: balance?.status === 'success' ? 'Connected' : 'Error',
            };
        } catch (err) {
            datamartStatus = {
                connected: false,
                message: 'Unavailable',
                lastCheck: new Date().toISOString(),
            };
        }

        await Order.recordAuditLog(req.admin.email, 'settings_viewed', null, null);

        res.json({
            status: 'success',
            data: {
                siteName: process.env.SITE_NAME || 'Brokeflex Data',
                supportEmail: process.env.SUPPORT_EMAIL || EMAIL_FROM,
                adminEmail: ADMIN_EMAIL,
                datamart: {
                    apiKey: maskApiKey(process.env.DATAMART_API_KEY),
                    baseUrl: process.env.DATAMART_BASE_URL || 'https://api.datamartgh.shop/api/developer',
                    status: datamartStatus,
                },
                paystack: {
                    secretKey: maskApiKey(process.env.PAYSTACK_SECRET_KEY),
                    publicKey: maskApiKey(process.env.PAYSTACK_PUBLIC_KEY),
                    baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
                },
                resend: {
                    apiKey: maskApiKey(process.env.RESEND_API_KEY),
                    emailFrom: EMAIL_FROM,
                    adminEmail: ADMIN_EMAIL,
                    configured: !!process.env.RESEND_API_KEY,
                },
            }
        });
    } catch (err) {
        logError(`Admin getSettings error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch settings.' });
    }
}

async function getAuditLogs(req, res) {
    try {
        const { action = '', admin = '', page = '1', limit = '100' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let logs = await Order.getAuditLogs(parseInt(limit), offset);

        if (action) {
            logs = logs.filter(l => l.action === action);
        }
        if (admin) {
            logs = logs.filter(l => l.admin_email.includes(admin));
        }

        await Order.recordAuditLog(req.admin.email, 'audit_logs_viewed', null, null);

        res.json({
            status: 'success',
            data: logs.map(l => ({
                id: l.id,
                adminEmail: l.admin_email,
                action: l.action,
                orderReference: l.order_reference,
                details: l.details,
                createdAt: l.created_at,
            }))
        });
    } catch (err) {
        logError(`Admin getAuditLogs error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch audit logs.' });
    }
}

/* ==================== CHECKER ADMIN FUNCTIONS ==================== */

function formatCheckerOrderResponse(order) {
    return {
        id: order.id,
        reference: order.reference,
        checkerType: order.checker_type,
        phoneNumber: order.phone_number,
        email: order.email,
        datamartCost: order.datamart_cost,
        markupPercentage: order.markup_percentage,
        sellingPrice: order.selling_price,
        amount: order.amount,
        amountPesewas: order.amount_pesewas,
        paystackFee: order.paystack_fee,
        paystackAmount: order.paystack_amount,
        paymentReference: order.payment_reference,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        datamartPurchaseId: order.datamart_purchase_id,
        datamartReference: order.datamart_reference,
        datamartTransactionId: order.datamart_transaction_id,
        serialNumber: order.serial_number,
        pin: order.pin,
        datamartResponse: order.datamart_response,
        createdAt: order.created_at,
        updatedAt: order.updated_at
    };
}

async function getCheckerOrders(req, res) {
    try {
        const {
            search = '',
            checkerType = '',
            paymentStatus = '',
            fulfillmentStatus = '',
            page = '1',
            limit = '50'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const queryLimit = parseInt(limit);

        const orders = await ResultCheckerOrder.search({
            search,
            checkerType: checkerType || undefined,
            paymentStatus: paymentStatus || undefined,
            fulfillmentStatus: fulfillmentStatus || undefined,
            offset,
            limit: queryLimit,
        });

        const countParams = {};
        if (checkerType) countParams.checkerType = checkerType;
        if (paymentStatus) countParams.paymentStatus = paymentStatus;
        if (fulfillmentStatus) countParams.fulfillmentStatus = fulfillmentStatus;

        const totalCount = await ResultCheckerOrder.count(countParams);
        const totalPages = Math.ceil(totalCount / queryLimit);

        await Order.recordAuditLog(
            req.admin.email,
            'checker_orders_viewed',
            null,
            `page=${page}&limit=${limit}&search=${search || 'none'}`
        );

        res.json({
            status: 'success',
            data: {
                orders: orders.map(formatCheckerOrderResponse),
                pagination: {
                    page: parseInt(page),
                    limit: queryLimit,
                    total: totalCount,
                    totalPages,
                }
            }
        });
    } catch (err) {
        logError(`Admin getCheckerOrders error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch checker orders.' });
    }
}

async function getCheckerOrder(req, res) {
    try {
        const { id } = req.params;
        let order;

        if (id.match(/^[0-9]+$/)) {
            order = await ResultCheckerOrder.getById(id);
        } else {
            order = await ResultCheckerOrder.getByReference(id);
        }

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Checker order not found.' });
        }

        const auditTrail = await Order.getAuditTrail(order.reference);

        await Order.recordAuditLog(
            req.admin.email,
            'checker_order_viewed',
            order.reference,
            null
        );

        res.json({
            status: 'success',
            data: {
                ...formatCheckerOrderResponse(order),
                auditTrail: auditTrail,
            }
        });
    } catch (err) {
        logError(`Admin getCheckerOrder error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch checker order.' });
    }
}

async function checkCheckerDatamartStatus(req, res) {
    try {
        const { id } = req.params;
        let order;

        if (id.match(/^[0-9]+$/)) {
            order = await ResultCheckerOrder.getById(id);
        } else {
            order = await ResultCheckerOrder.getByReference(id);
        }

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Checker order not found.' });
        }

        if (!order.datamart_reference) {
            return res.json({
                status: 'success',
                data: {
                    message: 'No DataMart reference found for this order.',
                    order: formatCheckerOrderResponse(order),
                }
            });
        }

        let datamartStatus = null;
        try {
            datamartStatus = await checkerService.checkResultCheckerStatus(order.reference);
        } catch (err) {
            logError(`DataMart checker status check failed for order ${order.reference}: ${err.message}`);
        }

        const updatedOrder = await ResultCheckerOrder.getByReference(order.reference);

        await Order.recordAuditLog(
            req.admin.email,
            'datamart_checker_status_checked',
            order.reference,
            `datamartStatus=${datamartStatus?.status || 'error'}`
        );

        res.json({
            status: 'success',
            data: {
                datamartStatus,
                order: formatCheckerOrderResponse(updatedOrder),
            }
        });
    } catch (err) {
        logError(`Admin checkCheckerDatamartStatus error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to check DataMart status.' });
    }
}

async function retryCheckerFulfillment(req, res) {
    try {
        const { id } = req.params;
        let order;

        if (id.match(/^[0-9]+$/)) {
            order = await ResultCheckerOrder.getById(id);
        } else {
            order = await ResultCheckerOrder.getByReference(id);
        }

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Checker order not found.' });
        }

        if (order.payment_status !== 'successful') {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot retry fulfillment. Payment was not successful.',
                paymentStatus: order.payment_status,
            });
        }

        if (order.fulfillment_status !== 'failed' && order.fulfillment_status !== 'pending' && order.fulfillment_status !== 'fulfillment_pending') {
            return res.status(400).json({
                status: 'error',
                message: `Cannot retry fulfillment. Current status is '${order.fulfillment_status}'.`,
                fulfillmentStatus: order.fulfillment_status,
            });
        }

        if (order.fulfillment_status === 'delivered') {
            return res.status(400).json({
                status: 'error',
                message: 'Order has already been successfully fulfilled.',
            });
        }

        await ResultCheckerOrder.update(order.reference, { fulfillment_status: 'pending' });
        await Order.auditLog(
            order.reference,
            'fulfillment_status',
            order.fulfillment_status,
            'pending',
            'admin_retry'
        );

        const result = await checkerService.fulfillCheckerOrder({
            ...order,
            fulfillment_status: 'pending'
        });

        await Order.recordAuditLog(
            req.admin.email,
            'checker_fulfillment_retried',
            order.reference,
            `result=${result.fulfillmentStatus}`
        );

        const updatedOrder = await ResultCheckerOrder.getByReference(order.reference);
        res.json({
            status: 'success',
            data: {
                message: 'Checker fulfillment retry initiated.',
                order: formatCheckerOrderResponse(updatedOrder),
                fulfillmentStatus: result.fulfillmentStatus,
            }
        });
    } catch (err) {
        logError(`Admin retryCheckerFulfillment error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to retry checker fulfillment.' });
    }
}

async function getCheckerDashboardStats(req, res) {
    try {
        const stats = await ResultCheckerOrder.getDashboardStats();

        await Order.recordAuditLog(
            req.admin.email,
            'checker_dashboard_viewed',
            null,
            null
        );

        res.json({
            status: 'success',
            data: stats
        });
    } catch (err) {
        logError(`Admin getCheckerDashboardStats error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch checker dashboard stats.' });
    }
}

async function getCheckerProductsAdmin(req, res) {
    try {
        const products = await checkerService.getCheckerProducts();

        await Order.recordAuditLog(
            req.admin.email,
            'checker_products_viewed',
            null,
            null
        );

        res.json({
            status: 'success',
            data: products,
            lastUpdated: new Date().toISOString()
        });
    } catch (err) {
        logError(`Admin getCheckerProductsAdmin error: ${err.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch checker products.' });
    }
}

module.exports = {
    getDashboard,
    getOrders,
    getOrder,
    getOrderAudits,
    checkDatamartStatus,
    retryFulfillment,
    getBundles,
    refreshBundles,
    verifyPaymentAdmin,
    getCustomers,
    getPayments,
    getEmails,
    sendTestEmail,
    getSettings,
    getAuditLogs,
    getCheckerOrders,
    getCheckerOrder,
    checkCheckerDatamartStatus,
    retryCheckerFulfillment,
    getCheckerDashboardStats,
    getCheckerProductsAdmin,
    verifyCheckerPaymentAdmin,
    formatCheckerOrderResponse,
    formatOrderResponse,
};
