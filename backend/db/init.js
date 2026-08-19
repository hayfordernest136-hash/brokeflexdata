const mysql = require('mysql2/promise');
const { logError, logInfo } = require('../utils/logger');

function parseDatabaseUrl(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            port: parseInt(parsed.port) || 3306,
            user: decodeURIComponent(parsed.username || ''),
            password: decodeURIComponent(parsed.password || ''),
            database: parsed.pathname.slice(1) || parsed.hostname,
        };
    } catch (err) {
        logError(`Failed to parse DATABASE_URL: ${err.message}`);
        return null;
    }
}

const dbUrl = process.env.DATABASE_URL;
let parsedConfig = null;

if (dbUrl) {
    parsedConfig = parseDatabaseUrl(dbUrl);
}

if (!parsedConfig) {
    console.warn('[Database] DATABASE_URL not set. Running in frontend-only mode (no DB).');
}

const pool = parsedConfig ? mysql.createPool({
    host: parsedConfig.host,
    port: parseInt(parsedConfig.port) || 3306,
    user: parsedConfig.user,
    password: parsedConfig.password,
    database: parsedConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    ssl: (parsedConfig.host !== 'localhost' && parsedConfig.host !== '127.0.0.1') ? { rejectUnauthorized: false } : undefined,
}) : null;

function requirePool() {
    if (!pool) throw new Error('Database not configured. DATABASE_URL is missing.');
    return pool;
}

async function getConnection() {
    return await requirePool().getConnection();
}

async function run(sql, params = []) {
    const conn = await getConnection();
    try {
        const [result] = await conn.execute(sql, params);
        conn.release();
        if (result.insertId !== undefined) {
            return { lastID: result.insertId, changes: result.affectedRows };
        }
        return { lastID: null, changes: result.affectedRows };
    } catch (err) {
        conn.release();
        throw err;
    }
}

async function get(sql, params = []) {
    const conn = await getConnection();
    try {
        const [rows] = await conn.execute(sql, params);
        conn.release();
        return rows[0] || null;
    } catch (err) {
        conn.release();
        throw err;
    }
}

async function all(sql, params = []) {
    const conn = await getConnection();
    try {
        const [rows] = await conn.execute(sql, params);
        conn.release();
        return rows;
    } catch (err) {
        conn.release();
        throw err;
    }
}

async function exec(sql) {
    const conn = await getConnection();
    try {
        await conn.query(sql);
        conn.release();
        return;
    } catch (err) {
        conn.release();
        throw err;
    }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(255) UNIQUE NOT NULL,
    network VARCHAR(50) NOT NULL,
    network_code VARCHAR(50) NOT NULL,
    bundle_capacity INT NOT NULL,
    bundle_capacity_string VARCHAR(50) NOT NULL,
    bundle_price DECIMAL(10,2) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    amount_pesewas INT NOT NULL,
    payment_reference VARCHAR(255) UNIQUE,
    payment_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    fulfillment_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    datamart_cost DECIMAL(10,2),
    markup_percentage DECIMAL(5,2) DEFAULT 17,
    selling_price DECIMAL(10,2),
    paystack_fee DECIMAL(10,2),
    paystack_amount DECIMAL(10,2),
    datamart_purchase_id VARCHAR(255),
    datamart_order_reference VARCHAR(255),
    datamart_transaction_reference VARCHAR(255),
    datamart_response TEXT,
    contact_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_reference ON orders(reference);
CREATE INDEX idx_orders_payment_reference ON orders(payment_reference);
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_fulfillment_status ON orders(fulfillment_status);

CREATE TABLE IF NOT EXISTS order_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_reference VARCHAR(255) NOT NULL,
    field_changed VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_audit_order_ref ON order_audit(order_reference);

CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_reference VARCHAR(255),
    recipient_email VARCHAR(255) NOT NULL,
    email_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    resend_id VARCHAR(255),
    error TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_email_order_ref ON email_events(order_reference);
CREATE INDEX idx_email_status ON email_events(status);

CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    order_reference VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_audit_admin_email ON audit_log(admin_email);
CREATE INDEX idx_audit_order_ref ON audit_log(order_reference);
CREATE INDEX idx_audit_action ON audit_log(action);
`;

const MIGRATIONS = [
    { table: 'orders', column: 'datamart_cost', definition: 'DECIMAL(10,2)' },
    { table: 'orders', column: 'markup_percentage', definition: 'DECIMAL(5,2) DEFAULT 17' },
    { table: 'orders', column: 'selling_price', definition: 'DECIMAL(10,2)' },
    { table: 'orders', column: 'paystack_fee', definition: 'DECIMAL(10,2)' },
    { table: 'orders', column: 'paystack_amount', definition: 'DECIMAL(10,2)' },
    { table: 'orders', column: 'contact_number', definition: 'VARCHAR(50)' },
];

async function columnExists(table, column) {
    try {
        const conn = await getConnection();
        const [rows] = await conn.execute(
            'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [table, column]
        );
        conn.release();
        return rows.length > 0;
    } catch (err) {
        logError(`Failed to check column existence: ${err.message}`);
        return false;
    }
}

async function runMigrations() {
    for (const migration of MIGRATIONS) {
        try {
            const exists = await columnExists(migration.table, migration.column);
            if (exists) {
                continue;
            }
            await exec(`ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.definition}`);
            logInfo(`Migration: added ${migration.column} to ${migration.table}`);
        } catch (err) {
            logError(`Migration failed for ${migration.column}: ${err.message}`);
        }
    }
}

async function seedAdminUser() {
    const rawEmail = process.env.ADMIN_EMAIL || 'hayfordernest136@gmail.com';
    const adminEmail = rawEmail === 'admin@brokeflexdata.com'
        ? 'hayfordernest136@gmail.com'
        : rawEmail;

    const bcrypt = require('bcryptjs');
    const password = process.env.ADMIN_PASSWORD || 'changeme-admin-password';
    const hash = await bcrypt.hash(password, 10);

    await run('DELETE FROM admin_users');
    await run('INSERT INTO admin_users (email, password_hash, role) VALUES (?, ?, ?)', [
        adminEmail, hash, 'admin'
    ]);
    logInfo(`[Database] Admin user reset to ${adminEmail} with fresh password.`);
}

async function migrateAdminCredentials() {
    const rawEmail = process.env.ADMIN_EMAIL || 'hayfordernest136@gmail.com';
    const adminEmail = rawEmail === 'admin@brokeflexdata.com'
        ? 'hayfordernest136@gmail.com'
        : rawEmail;

    const currentPassword = process.env.ADMIN_PASSWORD || 'Commonsense$5................';

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(currentPassword, 10);

    const existing = await get('SELECT * FROM admin_users WHERE email = ?', [adminEmail]);
    if (existing) {
        return;
    }

    const anyAdmin = await get('SELECT id, email FROM admin_users LIMIT 1');
    if (anyAdmin) {
        await run('UPDATE admin_users SET email = ?, password_hash = ?, role = ? WHERE id = ?', [
            adminEmail, hash, 'admin', anyAdmin.id
        ]);
        logInfo(`[Database] Migrated admin email from ${anyAdmin.email} to ${adminEmail}.`);
    } else {
        await run('INSERT INTO admin_users (email, password_hash, role) VALUES (?, ?, ?)', [
            adminEmail, hash, 'admin'
        ]);
        logInfo('[Database] Seeded admin user.');
    }
}

async function testConnection() {
    try {
        const conn = await getConnection();
        await conn.ping();
        conn.release();
        return true;
    } catch (err) {
        logError(`Database connection test failed: ${err.message}`);
        return false;
    }
}

async function initializeDatabase() {
    try {
        const statements = SCHEMA.split(';').filter(s => s.trim());
        for (const stmt of statements) {
            try {
                await exec(stmt.trim());
            } catch (err) {
                if (err.code === 'ER_DUP_KEYNAME' || err.errno === 1061) {
                    continue;
                }
                throw err;
            }
        }
        await runMigrations();
        await seedAdminUser();
        logInfo('[Database] Schema initialized successfully.');
    } catch (err) {
        logError(`[Database] Initialization failed: ${err.message}`);
        throw err;
    }
}

async function closePool() {
    if (pool) await pool.end();
}

module.exports = {
    pool,
    run,
    get,
    all,
    exec,
    initializeDatabase,
    closePool,
    getConnection,
    testConnection,
    migrateAdminCredentials,
};
