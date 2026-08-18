function logger(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const colors = {
        INFO: '\x1b[36m',
        WARN: '\x1b[33m',
        ERROR: '\x1b[31m',
        DEBUG: '\x1b[37m'
    };
    const reset = '\x1b[0m';
    const color = colors[level] || colors.INFO;
    console.log(`${color}[${level}] ${timestamp} - ${message}${reset}`);
}

module.exports = {
    logger,
    logInfo: (msg) => logger(msg, 'INFO'),
    logWarn: (msg) => logger(msg, 'WARN'),
    logError: (msg) => logger(msg, 'ERROR'),
    logDebug: (msg) => logger(msg, 'DEBUG')
};
