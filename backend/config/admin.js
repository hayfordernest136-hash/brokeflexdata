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
    let admin = await get('SELECT * FROM admin_users WHERE email = ?', [email]);

    if (!admin) {
        const altEmail = email === DESIRED_ADMIN_EMAIL ? OLD_ADMIN_EMAIL : DESIRED_ADMIN_EMAIL;
        const altAdmin = await get('SELECT * FROM admin_users WHERE email = ?', [altEmail]);
        if (altAdmin) {
            const valid = await bcrypt.compare(password, altAdmin.password_hash);
            if (valid) {
                const bcryptNew = require('bcryptjs');
                const newHash = await bcryptNew.hash(process.env.ADMIN_PASSWORD || 'Commonsense$5................', 10);
                if (email === DESIRED_ADMIN_EMAIL && altEmail === OLD_ADMIN_EMAIL) {
                    await run('UPDATE admin_users SET email = ?, password_hash = ? WHERE id = ?', [
                        DESIRED_ADMIN_EMAIL, newHash, altAdmin.id
                    ]);
                    logInfo(`[Admin] Migrated admin email from ${OLD_ADMIN_EMAIL} to ${DESIRED_ADMIN_EMAIL} at login.`);
                    altAdmin.email = DESIRED_ADMIN_EMAIL;
                    altAdmin.password_hash = newHash;
                }
                return generateToken(altAdmin, email);
            }
        }
        throw new Error('Invalid credentials');
    }

    let valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
        const altEmail = email === DESIRED_ADMIN_EMAIL ? OLD_ADMIN_EMAIL : DESIRED_ADMIN_EMAIL;
        const altAdmin = await get('SELECT * FROM admin_users WHERE email = ?', [altEmail]);
        if (altAdmin) {
            valid = await bcrypt.compare(password, altAdmin.password_hash);
            if (valid) {
                const bcryptNew = require('bcryptjs');
                const newHash = await bcryptNew.hash(process.env.ADMIN_PASSWORD || 'Commonsense$5................', 10);
                await run('UPDATE admin_users SET email = ?, password_hash = ? WHERE id = ?', [
                    DESIRED_ADMIN_EMAIL, newHash, altAdmin.id
                ]);
                logInfo(`[Admin] Migrated admin from ${altEmail} to ${DESIRED_ADMIN_EMAIL} at login.`);
                altAdmin.email = DESIRED_ADMIN_EMAIL;
                return generateToken(altAdmin, DESIRED_ADMIN_EMAIL);
            }
        }
        throw new Error('Invalid credentials');
    }

    if (admin.email !== DESIRED_ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
        const newHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Commonsense$5................', 10);
        await run('UPDATE admin_users SET email = ?, password_hash = ? WHERE id = ?', [
            DESIRED_ADMIN_EMAIL, newHash, admin.id
        ]);
        logInfo(`[Admin] Migrated admin email from ${admin.email} to ${DESIRED_ADMIN_EMAIL} at login.`);
        admin.email = DESIRED_ADMIN_EMAIL;
    }

    return generateToken(admin, admin.email);
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
