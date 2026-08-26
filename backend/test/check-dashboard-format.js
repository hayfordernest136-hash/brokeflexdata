const axios = require('axios');

(async () => {
    const loginRes = await axios.post('https://brokeflexdata-backend.onrender.com/api/admin/auth/login', {
        email: 'hayfordernest136@gmail.com',
        password: 'Commonsense$5'
    });
    const token = loginRes.data.data.token;

    const dashRes = await axios.get('https://brokeflexdata-backend.onrender.com/api/admin/dashboard', {
        headers: { Authorization: 'Bearer ' + token }
    });
    var d = dashRes.data.data;
    console.log('Dashboard response keys:', Object.keys(d));
    console.log('stats:', JSON.stringify(d.stats));
    console.log('recentOrders count:', d.recentOrders?.length || 0);
    if (d.recentOrders && d.recentOrders[0]) {
        var o = d.recentOrders[0];
        console.log('First order keys:', Object.keys(o).join(', '));
        console.log('  reference:', o.reference);
        console.log('  network:', o.network);
        console.log('  payment_status:', o.paymentStatus);
        console.log('  fulfillment_status:', o.fulfillmentStatus);
    }
})().catch(e => console.log('Error:', e.response?.data?.message || e.message));
