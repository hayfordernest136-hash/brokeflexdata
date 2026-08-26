const axios = require('axios');

(async () => {
    const loginRes = await axios.post('https://brokeflexdata-backend.onrender.com/api/admin/auth/login', {
        email: 'hayfordernest136@gmail.com',
        password: 'Commonsense$5'
    });
    const token = loginRes.data.data.token;

    const tests = [
        ['/admin/dashboard', 'Dashboard'],
        ['/admin/orders', 'Orders'],
        ['/admin/checkers', 'Checkers'],
    ];

    for (const [endpoint, name] of tests) {
        try {
            const res = await axios.get(
                'https://brokeflexdata-backend.onrender.com/api' + endpoint,
                { headers: { Authorization: 'Bearer ' + token } }
            );
            console.log(name + ': OK (' + res.status + '), data keys: ' + Object.keys(res.data).join(','));
        } catch (e) {
            console.log(name + ': ERROR - ' + (e.response?.status || 'NETWORK') + ' ' + (e.response?.data?.message || e.message));
        }
    }
})();
