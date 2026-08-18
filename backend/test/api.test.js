const axios = require('axios');

const BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}/api`;

async function runTests() {
    console.log('=== API Tests ===\n');

    // 1. Health check
    try {
        const r = await axios.get(`${BASE}/health`);
        console.log('1. Health:', r.data.status);
    } catch (e) {
        console.log('1. Health: FAILED', e.message);
    }

    // 2. Get networks
    try {
        const r = await axios.get(`${BASE}/bundles/networks`);
        console.log('2. Networks:', r.data.data.map(n => n.label).join(', '));
    } catch (e) {
        console.log('2. Networks: FAILED', e.message);
    }

    // 3. Get bundles for MTN
    try {
        const r = await axios.get(`${BASE}/bundles?network=YELLO`);
        const bundles = r.data.data.YELLO;
        console.log('3. MTN bundles:', bundles.length, 'bundles, first:', `${bundles[0].capacity}GB - GHS${bundles[0].price} (cost: GHS${bundles[0].datamartCost})`);
    } catch (e) {
        console.log('3. MTN bundles: FAILED', e.message);
    }

    // 4. Get bundles for Telecel
    try {
        const r = await axios.get(`${BASE}/bundles?network=TELECEL`);
        const bundles = r.data.data.TELECEL;
        console.log('4. Telecel bundles:', bundles.length, 'bundles, first:', `${bundles[0].capacity}GB - GHS${bundles[0].price}`);
    } catch (e) {
        console.log('4. Telecel bundles: FAILED', e.message);
    }

    // 5. Get bundles for AirtelTigo
    try {
        const r = await axios.get(`${BASE}/bundles?network=AT_PREMIUM`);
        const bundles = r.data.data.AT_PREMIUM;
        console.log('5. AirtelTigo bundles:', bundles.length, 'bundles, first:', `${bundles[0].capacity}GB - GHS${bundles[0].price}`);
    } catch (e) {
        console.log('5. AirtelTigo bundles: FAILED', e.message);
    }

    // 6. Create an order
    let orderRef = null;
    try {
        const r = await axios.post(`${BASE}/orders`, {
            network: 'MTN',
            bundleCapacity: '5',
            bundleCapacityString: '5',
            phoneNumber: '0551234567',
            email: 'test@example.com',
            contactNumber: '0551234567'
        });
        const orderData = r.data.data;
        orderRef = orderData.reference;
        console.log('6. Create order:', orderData.reference);
        console.log('   Selling price:', orderData.sellingPrice, 'GHS');
        console.log('   Paystack fee:', orderData.paystackFee, 'GHS');
        console.log('   Paystack amount:', orderData.paystackAmount, 'GHS');
    } catch (e) {
        console.log('6. Create order: FAILED', e.response?.data || e.message);
    }

    // 7. Get order by reference
    if (orderRef) {
        try {
            const r = await axios.get(`${BASE}/orders/${orderRef}`);
            const order = r.data.data;
            console.log('7. Get order:', order.reference, '- Network:', order.network, '- Payment:', order.paymentStatus, '- Fulfillment:', order.fulfillmentStatus);
            console.log('   Selling price:', order.sellingPrice, '- Paystack amount:', order.paystackAmount);
        } catch (e) {
            console.log('7. Get order: FAILED', e.message);
        }
    }

    // 8. Admin login + get orders
    try {
        const loginRes = await axios.post(`${BASE}/admin/auth/login`, {
            email: 'admin@brokeflexdata.com',
            password: 'changeme-admin-password'
        });
        const token = loginRes.data.data.token;
        console.log('8. Admin login: SUCCESS');

        const ordersRes = await axios.get(`${BASE}/admin/orders?limit=10`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Admin orders:', ordersRes.data.data.orders.length, 'orders found');

        const statsRes = await axios.get(`${BASE}/admin/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Dashboard stats:', JSON.stringify(statsRes.data.data.stats));
    } catch (e) {
        console.log('8. Admin: FAILED', e.response?.data || e.message);
    }

    // 9. Validation errors
    try {
        await axios.post(`${BASE}/orders`, {
            network: 'MTN',
            bundleCapacity: '5',
            phoneNumber: 'invalid',
            email: 'not-an-email'
        });
        console.log('9. Validation: should have failed');
    } catch (e) {
        console.log('9. Validation error (expected):', e.response?.data?.message);
    }

    console.log('\n=== Tests Complete ===');
}

runTests().catch(console.error);
