require('dotenv').config();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db/init');
const { logInfo, logError } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'brokeflex-admin-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

const DESIRED_ADMIN_EMAIL = 'hayfordernest136@gmail.com';
const OLD_ADMIN_EMAIL = 'admin@brokeflexdata.com';

function generateToken(admin, email) {
    const token = jwt.sign(
        { id: admin.id, email: email, role: admin.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return {
        token,
        admin: { id: admin.id, email: email, role: admin.role },
    };
}

async function loginAdmin(email, password) {
    const desiredAdmin = await get('SELECT * FROM admin_users WHERE email = ?', [DESIRED_ADMIN_EMAIL]);
    const oldAdmin = await get('SELECT * FROM admin_users WHERE email = ?', [OLD_ADMIN_EMAIL]);

    const candidates = [
        { admin: desiredAdmin, email: DESIRED_ADMIN_EMAIL },
        { admin: oldAdmin, email: OLD_ADMIN_EMAIL },
    ].filter(c => c.admin);

    let matched = null;
    for (const candidate of candidates) {
        if (await bcrypt.compare(password, candidate.admin.password_hash)) {
            matched = candidate;
            break;
        }
    }

    if (!matched) {
        throw new Error('Invalid credentials');
    }

    if (matched.email === OLD_ADMIN_EMAIL && desiredAdmin) {
        await run('DELETE FROM admin_users WHERE id = ? AND email = ?', [
            desiredAdmin.id, DESIRED_ADMIN_EMAIL
        ]);
    }

    if (matched.email !== DESIRED_ADMIN_EMAIL) {
        const newHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Commonsense$5................', 10);
        await run('UPDATE admin_users SET email = ?, password_hash = ? WHERE id = ?', [
            DESIRED_ADMIN_EMAIL, newHash, matched.admin.id
        ]);
        logInfo(`[Admin] Migrated admin email from ${matched.email} to ${DESIRED_ADMIN_EMAIL} at login.`);
        matched.admin.email = DESIRED_ADMIN_EMAIL;
        matched.admin.password_hash = newHash;
    }

    return generateToken(matched.admin, DESIRED_ADMIN_EMAIL);
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
