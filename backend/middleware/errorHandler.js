const { logError } = require('../utils/logger');

function errorHandler(err, req, res, next) {
    logError(`${req.method} ${req.url} - ${err.message}`);

    if (err.status) {
        return res.status(err.status).json({
            status: 'error',
            message: err.message
        });
    }

    if (err.response && err.response.data) {
        const providerMessage = err.response.data.message || err.response.data.error || 'Provider request failed';
        logError(`Provider error: ${JSON.stringify(err.response.data)}`);
        return res.status(502).json({
            status: 'error',
            message: 'Unable to reach service provider. Please try again later.'
        });
    }

    logError(`Unhandled error: ${err.stack || err.message}`);

    res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred. Please try again later.'
    });
}

module.exports = { errorHandler };
