const axios = require('axios');
const BASE = 'http://localhost:4000/api';

(async () => {
    try {
        const r = await axios.post(`${BASE}/orders`, {
            network: 'MTN',
            bundleCapacity: '5',
            bundleCapacityString: '5',
            phoneNumber: '0551234567',
            email: 'hayfordernest136@gmail.com',
            contactNumber: '0559876543'
        });
        console.log('Order created:', r.data.data.reference);
        console.log('Selling price:', r.data.data.sellingPrice, 'GHS');
        console.log('Admin notification sent to hayfordernest136@gmail.com');
    } catch (e) {
        console.log('Error:', e.response?.data || e.message);
    }
})();
