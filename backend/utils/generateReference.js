function generateReference(prefix = 'BFX') {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    return `${prefix}-${timestamp}${random}`;
}

function isValidReference(reference) {
    if (!reference || typeof reference !== 'string') return false;
    const clean = reference.toUpperCase().replace(/\s/g, '');
    return /^BFX-\d{10}$/.test(clean);
}

function generateUUID() {
    const { randomUUID } = require('crypto');
    return randomUUID();
}

module.exports = {
    generateReference,
    generateUUID,
    isValidReference
};
