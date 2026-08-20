const { get, all, run } = require('../db/init');

async function createOrder(order) {
    const sql = `
        INSERT INTO orders (
            reference, network, network_code, bundle_capacity,
            bundle_capacity_string, bundle_price, phone_number, email,
            amount, amount_pesewas, payment_reference, payment_status,
            fulfillment_status, datamart_cost, markup_percentage,
            selling_price, paystack_fee, paystack_amount, contact_number,
            created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending',
            ?, ?, ?, ?, ?, ?,
            NOW(), NOW()
        )
    `;
    const params = [
        order.reference, order.network, order.network_code,
        order.bundle_capacity, order.bundle_capacity_string, order.bundle_price,
        order.phone_number, order.email, order.amount, order.amount_pesewas,
        order.payment_reference || null,
        order.datamart_cost || null,
        order.markup_percentage || 15,
        order.selling_price || null,
        order.paystack_fee || null,
        order.paystack_amount || null,
        order.contact_number || null,
    ];
    const result = await run(sql, params);
    return getOrderById(result.lastID);
}

async function getOrderByReference(reference) {
    return get('SELECT * FROM orders WHERE reference = ?', [reference]);
}

async function getOrderByPaymentReference(paymentReference) {
    return get('SELECT * FROM orders WHERE payment_reference = ?', [paymentReference]);
}

async function getOrderById(id) {
    return get('SELECT * FROM orders WHERE id = ?', [id]);
}

const ALLOWED_UPDATE_FIELDS = [
    'payment_status', 'fulfillment_status', 'payment_reference',
    'datamart_purchase_id', 'datamart_order_reference',
    'datamart_transaction_reference', 'datamart_response',
    'amount', 'amount_pesewas', 'phone_number', 'email',
    'bundle_capacity', 'bundle_capacity_string', 'bundle_price',
    'network', 'network_code',
    'datamart_cost', 'markup_percentage',
    'selling_price', 'paystack_fee', 'paystack_amount', 'contact_number',
];

async function updateOrder(reference, updates) {
    const fields = Object.keys(updates).filter(f => ALLOWED_UPDATE_FIELDS.includes(f));
    if (fields.length === 0) return getOrderByReference(reference);

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    values.push(reference);

    const sql = `UPDATE orders SET ${setClause}, updated_at = NOW() WHERE reference = ?`;
    await run(sql, values);
    return getOrderByReference(reference);
}

async function getAllOrders(limit = 50, offset = 0) {
    return all(`SELECT * FROM orders ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`);
}

async function searchOrders(params) {
    const { search, network, paymentStatus, fulfillmentStatus, offset = 0, limit = 50 } = params;

    const conditions = [];
    const values = [];

    if (search) {
        conditions.push(`(
            reference LIKE ? OR
            phone_number LIKE ? OR
            email LIKE ? OR
            payment_reference LIKE ? OR
            datamart_order_reference LIKE ? OR
            datamart_transaction_reference LIKE ?
        )`);
        const term = `%${search}%`;
        values.push(term, term, term, term, term, term);
    }

    if (network) {
        conditions.push('network = ?');
        values.push(network);
    }

    if (paymentStatus) {
        conditions.push('payment_status = ?');
        values.push(paymentStatus);
    }

    if (fulfillmentStatus) {
        conditions.push('fulfillment_status = ?');
        values.push(fulfillmentStatus);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    return all(sql, values);
}

async function countOrders(params = {}) {
    const conditions = [];
    const values = [];

    if (params.network) {
        conditions.push('network = ?');
        values.push(params.network);
    }

    if (params.paymentStatus) {
        conditions.push('payment_status = ?');
        values.push(params.paymentStatus);
    }

    if (params.fulfillmentStatus) {
        conditions.push('fulfillment_status = ?');
        values.push(params.fulfillmentStatus);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const row = await get(`SELECT COUNT(*) as count FROM orders ${whereClause}`, values);
    return row.count;
}

async function getDashboardStats() {
    const stats = {};

    stats.totalOrders = (await get('SELECT COUNT(*) as count FROM orders')).count;
    stats.totalRevenue = parseFloat((await get('SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE payment_status = ?', ['successful'])).total);

    stats.pendingOrders = (await get('SELECT COUNT(*) as count FROM orders WHERE payment_status = ? AND fulfillment_status = ?', ['pending', 'pending'])).count;
    stats.processingOrders = (await get('SELECT COUNT(*) as count FROM orders WHERE fulfillment_status = ?', ['processing'])).count;
    stats.deliveredOrders = (await get('SELECT COUNT(*) as count FROM orders WHERE fulfillment_status = ?', ['delivered'])).count;
    stats.failedOrders = (await get('SELECT COUNT(*) as count FROM orders WHERE fulfillment_status = ?', ['failed'])).count;

    stats.totalPaid = (await get('SELECT COUNT(*) as count FROM orders WHERE payment_status = ?', ['successful'])).count;
    stats.failedPayments = (await get('SELECT COUNT(*) as count FROM orders WHERE payment_status = ?', ['failed'])).count;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString().slice(0, 19).replace('T', ' ');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    stats.thisMonthRevenue = parseFloat((await get(
        'SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE payment_status = ? AND created_at >= ?'
        ['successful', monthStartStr]
    )).total;

    stats.thisMonthOrders = (await get(
        'SELECT COUNT(*) as count FROM orders WHERE created_at >= ?',
        [monthStartStr]
    )).count;

    return stats;
}

async function auditLog(reference, field, oldValue, newValue, changedBy) {
    const sql = `
        INSERT INTO order_audit (order_reference, field_changed, old_value, new_value, changed_by, changed_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    `;
    await run(sql, [reference, field, oldValue, newValue, changedBy]);
}

async function getOrderAuditTrail(reference) {
    return all(
        'SELECT * FROM order_audit WHERE order_reference = ? ORDER BY changed_at ASC',
        [reference]
    );
}

async function recordAuditLog(adminEmail, action, orderReference, details) {
    return run(
        'INSERT INTO audit_log (admin_email, action, order_reference, details, created_at) VALUES (?, ?, ?, ?, NOW())',
        [adminEmail, action, orderReference || null, details || null]
    );
}

async function getAuditLogs(limit = 100, offset = 0) {
    return all(
        `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`
    );
}

async function getEmailEvents(limit = 100, offset = 0) {
    return all(
        `SELECT * FROM email_events ORDER BY sent_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`
    );
}

async function countEmailEvents(status) {
    if (status) {
        const row = await get('SELECT COUNT(*) as count FROM email_events WHERE status = ?', [status]);
        return row.count;
    }
    const row = await get('SELECT COUNT(*) as count FROM email_events');
    return row.count;
}

async function getRecentOrders(limit = 10) {
    return all(
        `SELECT * FROM orders ORDER BY created_at DESC LIMIT ${parseInt(limit)}`
    );
}

async function getOrdersByStatus(status, limit = 50, offset = 0) {
    return all(
        `SELECT * FROM orders WHERE fulfillment_status = ? ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        [status]
    );
}

module.exports = {
    Order: {
        create: createOrder,
        getByReference: getOrderByReference,
        getByPaymentReference: getOrderByPaymentReference,
        getById: getOrderById,
        update: updateOrder,
        getAll: getAllOrders,
        search: searchOrders,
        count: countOrders,
        getDashboardStats,
        auditLog,
        getAuditTrail: getOrderAuditTrail,
        getRecentOrders,
        getOrdersByStatus,
        recordAuditLog,
        getAuditLogs,
        getEmailEvents,
        countEmailEvents,
        getAllWithPagination: getAllOrders,
    }
};
