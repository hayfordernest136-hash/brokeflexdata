const { get, all, run } = require('../db/init');

const CHECKER_ALLOWED_UPDATE_FIELDS = [
    'payment_status', 'fulfillment_status', 'payment_reference',
    'datamart_purchase_id', 'datamart_reference', 'datamart_transaction_id',
    'serial_number', 'pin', 'datamart_response',
    'amount', 'amount_pesewas',
    'datamart_cost', 'markup_percentage', 'selling_price',
    'paystack_fee', 'paystack_amount', 'checker_type', 'phone_number', 'email'
];

async function createCheckerOrder(order) {
    const sql = `
        INSERT INTO result_checker_orders (
            reference, checker_type, phone_number, email,
            datamart_cost, markup_percentage, selling_price,
            amount, amount_pesewas, paystack_fee, paystack_amount,
            payment_reference, payment_status, fulfillment_status,
            datamart_purchase_id, datamart_reference, datamart_transaction_id,
            serial_number, pin, datamart_response,
            created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending',
            ?, ?, ?, ?, ?, ?,
            NOW(), NOW()
        )
    `;
    const params = [
        order.reference, order.checker_type, order.phone_number, order.email,
        order.datamart_cost, order.markup_percentage, order.selling_price,
        order.amount, order.amount_pesewas, order.paystack_fee, order.paystack_amount,
        order.payment_reference || null,
        order.datamart_purchase_id || null,
        order.datamart_reference || null,
        order.datamart_transaction_id || null,
        order.serial_number || null,
        order.pin || null,
        order.datamart_response || null
    ];
    const result = await run(sql, params);
    return getCheckerOrderById(result.lastID);
}

async function getCheckerOrderByReference(reference) {
    return get('SELECT * FROM result_checker_orders WHERE reference = ?', [reference]);
}

async function getCheckerOrderByPaymentReference(paymentReference) {
    return get('SELECT * FROM result_checker_orders WHERE payment_reference = ?', [paymentReference]);
}

async function getCheckerOrderById(id) {
    return get('SELECT * FROM result_checker_orders WHERE id = ?', [id]);
}

async function updateCheckerOrder(reference, updates) {
    const fields = Object.keys(updates).filter(f => CHECKER_ALLOWED_UPDATE_FIELDS.includes(f));
    if (fields.length === 0) return getCheckerOrderByReference(reference);

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    values.push(reference);

    const sql = `UPDATE result_checker_orders SET ${setClause}, updated_at = NOW() WHERE reference = ?`;
    await run(sql, values);
    return getCheckerOrderByReference(reference);
}

async function getAllCheckerOrders(limit = 50, offset = 0) {
    return all(`SELECT * FROM result_checker_orders ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`);
}

async function searchCheckerOrders(params) {
    const { search, checkerType, paymentStatus, fulfillmentStatus, offset = 0, limit = 50 } = params;

    const conditions = [];
    const values = [];

    if (search) {
        conditions.push(`(
            reference LIKE ? OR
            phone_number LIKE ? OR
            email LIKE ? OR
            payment_reference LIKE ? OR
            datamart_reference LIKE ? OR
            datamart_transaction_id LIKE ? OR
            serial_number LIKE ?
        )`);
        const term = `%${search}%`;
        values.push(term, term, term, term, term, term, term);
    }

    if (checkerType) {
        conditions.push('checker_type = ?');
        values.push(checkerType);
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
    const sql = `SELECT * FROM result_checker_orders ${whereClause} ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    return all(sql, values);
}

async function countCheckerOrders(params = {}) {
    const conditions = [];
    const values = [];

    if (params.checkerType) {
        conditions.push('checker_type = ?');
        values.push(params.checkerType);
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
    const row = await get(`SELECT COUNT(*) as count FROM result_checker_orders ${whereClause}`, values);
    return row.count;
}

async function getCheckerDashboardStats() {
    const stats = {};

    stats.totalOrders = (await get('SELECT COUNT(*) as count FROM result_checker_orders')).count;

    stats.totalRevenue = parseFloat((await get('SELECT COALESCE(SUM(amount), 0) as total FROM result_checker_orders WHERE payment_status = ?', ['successful'])).total);

    stats.totalDatamartCost = parseFloat((await get('SELECT COALESCE(SUM(datamart_cost), 0) as total FROM result_checker_orders WHERE payment_status = ?', ['successful'])).total);

    stats.totalMarkup = parseFloat((await get('SELECT COALESCE(SUM(selling_price - datamart_cost), 0) as total FROM result_checker_orders WHERE payment_status = ?', ['successful'])).total);

    stats.waecOrders = (await get('SELECT COUNT(*) as count FROM result_checker_orders WHERE checker_type = ?', ['WAEC'])).count;
    stats.beceOrders = (await get('SELECT COUNT(*) as count FROM result_checker_orders WHERE checker_type = ?', ['BECE'])).count;

    stats.completedOrders = (await get('SELECT COUNT(*) as count FROM result_checker_orders WHERE fulfillment_status = ?', ['delivered'])).count;
    stats.pendingOrders = (await get('SELECT COUNT(*) as count FROM result_checker_orders WHERE payment_status = ? AND fulfillment_status = ?', ['pending', 'pending'])).count;
    stats.failedOrders = (await get('SELECT COUNT(*) as count FROM result_checker_orders WHERE fulfillment_status = ?', ['failed'])).count;

    return stats;
}

async function getCheckerOrdersByStatus(status, limit = 50, offset = 0) {
    return all(
        `SELECT * FROM result_checker_orders WHERE fulfillment_status = ? ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        [status]
    );
}

async function recordCheckerAuditLog(orderReference, field, oldValue, newValue, changedBy) {
    const sql = `
        INSERT INTO order_audit (order_reference, field_changed, old_value, new_value, changed_by, changed_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    `;
    await run(sql, [orderReference, field, oldValue, newValue, changedBy]);
}

async function getCheckerAuditTrail(reference) {
    return all(
        'SELECT * FROM order_audit WHERE order_reference = ? ORDER BY changed_at ASC',
        [reference]
    );
}

async function getRecentCheckerOrders(limit = 10) {
    return all(
        `SELECT * FROM result_checker_orders ORDER BY created_at DESC LIMIT ${parseInt(limit)}`
    );
}

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

module.exports = {
    ResultCheckerOrder: {
        create: createCheckerOrder,
        getByReference: getCheckerOrderByReference,
        getByPaymentReference: getCheckerOrderByPaymentReference,
        getById: getCheckerOrderById,
        update: updateCheckerOrder,
        getAll: getAllCheckerOrders,
        search: searchCheckerOrders,
        count: countCheckerOrders,
        getDashboardStats: getCheckerDashboardStats,
        auditLog: recordCheckerAuditLog,
        getAuditTrail: getCheckerAuditTrail,
        getRecentOrders: getRecentCheckerOrders,
        getOrdersByStatus: getCheckerOrdersByStatus,
        formatResponse: formatCheckerOrderResponse
    }
};
