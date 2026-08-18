require('dotenv').config();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db/init');

const JWT_SECRET = process.env.JWT_SECRET || 'brokeflex-admin-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

async function loginAdmin(email, password) {
    const admin = await get('SELECT * FROM admin_users WHERE email = ?', [email]);

    if (!admin) {
        throw new Error('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, admin.password_hash);

    if (!valid) {
        throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
        {
            id: admin.id,
            email: admin.email,
            role: admin.role,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return {
        token,
        admin: {
            id: admin.id,
            email: admin.email,
            role: admin.role,
        },
    };
}

function adminAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
}

module.exports = {
    loginAdmin,
    adminAuth,
    JWT_SECRET,
    JWT_EXPIRES_IN,
};
