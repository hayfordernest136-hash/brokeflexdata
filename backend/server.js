const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const https = require('https');
const http = require('http');
const { initializeDatabase, testConnection, migrateAdminCredentials } = require('./db/init');
const { errorHandler } = require('./middleware/errorHandler');
const { asyncHandler } = require('./middleware/asyncHandler');
const { warmBundlesCache } = require('./controllers/bundleController');

const app = express();
const PORT = process.env.PORT || 4000;

const isDatabaseConfigured = !!process.env.DATABASE_URL;

if (!isDatabaseConfigured) {
    const BACKEND_API_URL = process.env.BACKEND_API_URL;

    if (BACKEND_API_URL) {
        console.warn(`[Proxy] Frontend-only mode. Proxying /api requests to ${BACKEND_API_URL}`);

        function createProxyMiddleware(target, includePrefix = false) {
            const targetUrl = new URL(target);
            return function (req, res) {
                const path = includePrefix ? req.originalUrl : req.url;
                const parsedUrl = new URL(path, target);
                const options = {
                    hostname: targetUrl.hostname,
                    port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: req.method,
                    headers: { ...req.headers, host: targetUrl.host },
                };

                const lib = targetUrl.protocol === 'https:' ? https : http;
                const proxyReq = lib.request(options, (proxyRes) => {
                    res.writeHead(proxyRes.statusCode, proxyRes.headers);
                    proxyRes.pipe(res);
                });

                proxyReq.on('error', () => {
                    res.status(502).json({ status: 'error', message: 'Backend service unavailable.' });
                });

                req.pipe(proxyReq);
            };
        }

        app.use('/api', createProxyMiddleware(BACKEND_API_URL, true));
    }
}

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const isDevelopment = process.env.NODE_ENV !== 'production';

const configuredOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = new Set([configuredOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173']);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        if (origin.match(/\.onrender\.com$/)) return callback(null, true);
        if (process.env.CORS_ORIGINS && isDevelopment) {
            return callback(null, process.env.CORS_ORIGINS.split(',').includes(origin));
        }
        return callback(null, true);
    },
    credentials: true
};

app.use(cors(corsOptions));

app.use(morgan(isDevelopment ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const bundleRoutes = require('./routes/bundleRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const checkerRoutes = require('./routes/checkerRoutes');

app.use('/api/bundles', bundleRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkers', checkerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);

app.get('/api/health', async (req, res) => {
    const dbOk = await testConnection();
    res.json({
        status: dbOk ? 'ok' : 'degraded',
        database: dbOk ? 'connected' : 'disconnected',
        databaseType: 'mysql',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/config', (req, res) => {
    res.json({
        paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
        currency: 'GHS',
        siteName: 'Brokeflex Data'
    });
});

app.use('/api/*', (req, res) => {
    res.status(404).json({ status: 'error', message: 'API endpoint not found.' });
});

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist, {
    maxAge: '1y',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(frontendDist, 'admin.html'), {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
});

app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'admin.html'), {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'), {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Server] Brokeflex Data backend running on port ${PORT}`);
        console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`[Server] Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
        console.log(`[Server] Database: ${process.env.DATABASE_URL ? 'initializing' : 'skipped (no DATABASE_URL) - serving frontend only'}`);
        warmBundlesCache();
    });

    if (process.env.DATABASE_URL) {
        initializeDatabase()
            .then(async () => {
                await migrateAdminCredentials();
                console.log('[Database] MySQL connected and initialized');
            })
            .catch(err => {
                console.error('[Database] Failed to initialize MySQL database:', err.message);
                console.error('[Database] Ensure DATABASE_URL is set correctly');
            });
    }
}

module.exports = { app };
