const { loginAdmin } = require('../config/admin');
const { logInfo, logError } = require('../utils/logger');

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ status: 'error', message: 'Email and password are required.' });
        }

        const result = await loginAdmin(email, password);

        logInfo(`Admin login successful for ${email}`);

        res.json({
            status: 'success',
            data: {
                token: result.token,
                admin: result.admin,
            }
        });
    } catch (err) {
        logError(`Admin login failed: ${err.message}`);
        res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }
}

module.exports = {
    login,
};
